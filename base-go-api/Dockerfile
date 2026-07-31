# syntax=docker/dockerfile:1

FROM golang:1.26.5-alpine AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate

FROM alpine:3.22 AS runtime

RUN addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY configs ./configs
USER app

FROM runtime AS api

COPY --from=build /out/api ./api
EXPOSE 8080
ENTRYPOINT ["/app/api"]

FROM runtime AS migrate

COPY --from=build /out/migrate ./migrate
COPY migrations ./migrations
ENTRYPOINT ["/app/migrate"]
