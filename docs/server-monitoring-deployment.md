# Linux 宿主机监控部署

本模块只正式支持单台 Linux 宿主机。直接运行 API 时选择 `native`；Docker 中的 API 必须选择 `unix` 并连接运行在同一宿主机上的采集进程。不能用容器内 `/proc`、`/sys` 或容器挂载点代替宿主机资源。采集失败不会自动切换来源。

## 采集依赖和权限

CPU、内存、负载、进程和网卡累计计数使用项目已有的 `prometheus/procfs`，块设备使用同库的 `blockdevice`，文件系统容量使用 `x/sys/unix.Statfs`。采集依赖仅位于 monitoring 的 Linux 边界，无新增 Go 依赖。NVIDIA 通过宿主机驱动自带的 `nvidia-smi` 只读查询，命令有超时；不安装驱动、不改变 GPU 配置。字段返回 `N/A` 时保留为空并说明不支持，GPU 身份使用 UUID。

使用专用用户 `base-monitor`，无需给予 API 容器 root、host 网络或特权权限。普通 Linux `/proc` 通常允许读取基础进程统计；启用 `hidepid`、安全策略或挂载访问限制时，页面会显示覆盖不完整或失败。按主机已有的 proc 读取组策略授权专用用户，避免为方便采集授予任意 sudo。NVIDIA 权限遵循宿主机驱动设备的现有访问组策略。

## 宿主机采集进程

在 Linux 宿主机构建发布二进制：

```bash
task host:build
sudo groupadd --system base-monitor
sudo useradd --system --gid base-monitor --no-create-home --shell /usr/sbin/nologin base-monitor
sudo install -o root -g root -m 0755 bin/base-go-host-collector /usr/local/bin/base-go-host-collector
```

已存在的组和用户无需重复创建。安装以下 `/etc/systemd/system/base-go-host-collector.service`，socket 目录由 systemd 创建，其用户和组均为 `base-monitor`，目录权限 `0750`，socket 权限 `0660`：

```ini
[Unit]
Description=Base Go Linux host resource collector
After=local-fs.target

[Service]
Type=simple
User=base-monitor
Group=base-monitor
RuntimeDirectory=base-go-api
RuntimeDirectoryMode=0750
ExecStart=/usr/local/bin/base-go-host-collector -socket /run/base-go-api/host-monitor.sock
Restart=on-failure
RestartSec=3
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

不要设置 `PrivateNetwork`、`PrivateMounts`、`PrivateDevices`、`PrivateUsers`、`ProtectSystem`、`ProtectHome`，否则可能改变待采集资源范围或阻止驱动访问。挂载命名空间沙箱会改变挂载点列表，因此采集服务应保持宿主机挂载范围。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now base-go-host-collector
sudo systemctl status base-go-host-collector --no-pager
sudo journalctl -u base-go-host-collector -n 30 --no-pager
timeout 5 sudo -u base-monitor curl --fail --unix-socket /run/base-go-api/host-monitor.sock http://localhost/snapshot
```

开发启动入口为 `task host:collector CLI_ARGS='-socket /tmp/base-go-host-collector.sock'`；正式部署使用上述 `/run` 路径。采样周期固定为 5 秒，单次 Linux 采集预算最多 3.5 秒，为 API 的默认 4 秒超时留出返回余量，同一采集任务不会重叠。socket 只返回当前样本，不储存历史。

## API 配置和 Docker 映射

在既有 YAML 配置内设置：

```yaml
monitoring:
  source: unix
  socket_path: /run/base-go-api/host-monitor.sock
  timeout: 4s
```

环境变量覆盖名称沿用现有双下划线嵌套规则：`APP_MONITORING__SOURCE`、`APP_MONITORING__SOCKET_PATH`、`APP_MONITORING__TIMEOUT`。原生 API 设置 `source: native`；API 内部采集无需启动额外进程。

现有 `base-go-api/docker-compose.dev.yml` 已接入目录映射及访问组。启动 Compose 前将 `HOST_MONITOR_SOCKET_DIR=/run/base-go-api` 与 `HOST_MONITOR_GID` 写入部署环境；后者为 `getent group base-monitor` 显示的数值 GID。等价的 API 服务配置如下：

```yaml
services:
  api:
    environment:
      APP_MONITORING__SOURCE: unix
      APP_MONITORING__SOCKET_PATH: /run/base-go-api/host-monitor.sock
    volumes:
      - "${HOST_MONITOR_SOCKET_DIR:-/run/base-go-api}:/run/base-go-api:ro"
    group_add:
      - "${HOST_MONITOR_GID}"
```

挂载目录而不是单个 socket 文件，可让采集进程重启后新建的 socket 继续被容器看到。API 容器用户需要该目录的执行权限与 socket 的组读写权限；Unix socket 只允许获授权的本机用户访问，不暴露 TCP 端口。

## 升级和范围验收

重新构建二进制，使用 `install` 替换 `/usr/local/bin/base-go-host-collector`，再执行 `sudo systemctl restart base-go-host-collector`。不要删除 API 历史：采集进程重启仅重新建立 CPU、块设备、网络和进程基线，API 的已有历史保留，中断会形成缺口。API 重启才清空其自身的 30 分钟内存历史。

真实 Linux Docker 验收需要记录：宿主机 `hostname`、`cat /etc/os-release`、`ip -brief link`、`findmnt`，与 socket 样本和 API 概览的主机名、网卡和挂载点对照。再以带超时的请求验证错误组权限、停止采集进程、重启采集进程后首个速率样本的采集中状态和历史缺口。每项验证完成后恢复服务和原有权限，清理临时 socket 与测试进程。

执行 `task host:smoke`，使用临时 socket 验证真实宿主机身份、网卡、挂载点、首个速率样本、重复读取时间与采集进程重启后的新来源和基线。脚本自动清理进程及 socket，每次等待最多 12 秒，可用 `task host:smoke CLI_ARGS='--output /tmp/host-monitor-evidence.json'` 留存证据。

执行 `task build` 后运行 `task monitoring:smoke:docker CLI_ARGS='--output /tmp/monitoring-docker-evidence.json'`，可验证真实原生 API 和使用临时 SQLite 数据、非 root 用户、独立网络及只读 socket 挂载的 Docker API。脚本依赖 `golang:1.26.5-bookworm` 镜像，验证 socket 权限失败、断开过期、重启基线、已有历史和缺口，并自动清理临时进程、容器和数据库。页面浏览器验证入口为 `task frontend:monitoring`。

2026-10-04 在 Linux WSL 宿主机 `skyrim` 上运行该脚本通过：20 个逻辑核、10 个物理核、40 个可读取文件系统、6 个块设备，以及 `eth0/eth1/eth2/eth3/lo/loopback0` 接口均与主机范围一致。socket 权限 `0660`、重复拉取的有效时间保留、采集进程退出后 socket 清理、重启后来源身份更新和速率基线重建均通过。WSL 的 9p 挂载选项含空格，采集器按固定分隔符解析已作真实及回归验证。

NVIDIA 真机验收必须记录 GPU 型号、驱动版本、UUID、各字段支持情况和观察结果，至少覆盖声明支持的多卡场景与 Docker API 读取宿主机样本的场景。模拟 CSV、无 GPU 机器上的测试和编译通过均不等于 GPU 真机验收通过。当前 Linux WSL 环境只读查询确认单张 NVIDIA GeForce RTX 4060，驱动 610.88，显存 8188 MiB，温度字段可用，功耗返回 `[N/A]`；多卡与完整 Linux NVIDIA 部署仍待真机验收。

指标口径依据 [Linux I/O statistics](https://docs.kernel.org/admin-guide/iostats.html) 和 [NVIDIA nvidia-smi](https://docs.nvidia.com/deploy/nvidia-smi/index.html)：块设备扇区累计数转换采用内核统计的 512 字节单位，NVIDIA 不支持的查询字段不能解释为零。
