# ==============================================================================
# CLM Satellite Gateway Production Minimal Dockerfile
# ==============================================================================
# Build Stage
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o gateway ./cmd/gateway

# Production Minimal Stage
FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app
COPY --from=builder /app/gateway /app/gateway

ENV CLM_CONTROL_PLANE_URL="https://api.clm-platform.com/api/v1"
ENV CLM_ENROLLMENT_TOKEN=""
ENV CLM_GATEWAY_WEB_PORT=8080

EXPOSE 8080

ENTRYPOINT ["/app/gateway"]

