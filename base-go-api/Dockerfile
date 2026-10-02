# syntax=docker/dockerfile:1

FROM node:24-alpine AS frontend

WORKDIR /web
COPY react-admin/package.json react-admin/package-lock.json ./
RUN npm ci
COPY react-admin/ ./
RUN npm run build

FROM golang:1.26.5-alpine AS build

WORKDIR /src

RUN apk add --no-cache gcc musl-dev

COPY base-go-api/go.mod base-go-api/go.sum ./
RUN go mod download

COPY base-go-api/ .
RUN CGO_ENABLED=1 go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate
RUN CGO_ENABLED=1 go build -trimpath -ldflags="-s -w" -o /out/backup ./cmd/backup

FROM build AS api-build

COPY --from=frontend /web/dist ./internal/webui/dist
RUN CGO_ENABLED=1 go build -tags=embedweb -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

FROM alpine:3.22 AS runtime

RUN addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY base-go-api/configs ./configs
# Named-volume mount point: must exist and be writable by the app user,
# otherwise file uploads fail with permission denied after the first boot.
RUN mkdir -p /var/lib/base-go-api/uploads && chown -R app:app /var/lib/base-go-api
USER app

FROM runtime AS api

COPY --from=api-build /out/api ./api
EXPOSE 8080
ENTRYPOINT ["/app/api"]

FROM runtime AS migrate

COPY --from=build /out/migrate ./migrate
COPY base-go-api/migrations ./migrations
ENTRYPOINT ["/app/migrate"]

FROM runtime AS backup

COPY --from=build /out/backup ./backup
ENTRYPOINT ["/app/backup"]
