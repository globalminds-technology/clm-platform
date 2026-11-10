package config

import (
	"os"
	"time"
)

type Config struct {
	ControlPlaneURL   string
	EnrollmentToken   string
	GatewayID         string
	GatewaySecret     string
	HeartbeatInterval time.Duration
	Version           string
	Hostname          string
}

func LoadConfig() *Config {
	controlPlane := os.Getenv("CLM_CONTROL_PLANE_URL")
	if controlPlane == "" {
		controlPlane = "http://localhost:4000/api/v1"
	}

	token := os.Getenv("CLM_ENROLLMENT_TOKEN")
	gatewayID := os.Getenv("CLM_GATEWAY_ID")
	gatewaySecret := os.Getenv("CLM_GATEWAY_SECRET")

	hostname, err := os.Hostname()
	if err != nil {
		hostname = "gateway-host-local"
	}

	return &Config{
		ControlPlaneURL:   controlPlane,
		EnrollmentToken:   token,
		GatewayID:         gatewayID,
		GatewaySecret:     gatewaySecret,
		HeartbeatInterval: 30 * time.Second,
		Version:           "1.0.0",
		Hostname:          hostname,
	}
}

