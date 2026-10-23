import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

// Ant Design's DatePicker/RangePicker panel labels come from Day.js, not only
// from ConfigProvider's locale. Set the global locale once at startup.
dayjs.locale('zh-cn');

export { dayjs };
