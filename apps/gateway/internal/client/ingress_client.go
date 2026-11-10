package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type IngressClient struct {
	baseURL    string
	httpClient *http.Client
}

type EnrollRequest struct {
	Token    string `json:"token"`
	Hostname string `json:"hostname"`
	IpAddress string `json:"ipAddress"`
	Version  string `json:"version"`
}

type EnrollResponse struct {
	GatewayID string `json:"gatewayId"`
	TenantID  string `json:"tenantId"`
	Status    string `json:"status"`
}

type HeartbeatRequest struct {
	GatewayID        string            `json:"gatewayId"`
	Version          string            `json:"version"`
	IpAddress        string            `json:"ipAddress"`
	ActiveCertsCount int               `json:"activeCertsCount"`
	Metrics          map[string]float64 `json:"metrics"`
}

type Command struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Payload   map[string]interface{} `json:"payload"`
	Signature string                 `json:"signature"`
}

type HeartbeatResponse struct {
	Acknowledged bool      `json:"acknowledged"`
	Commands     []Command `json:"commands"`
}

type CommandAckRequest struct {
	CommandID    string                 `json:"commandId"`
	GatewayID    string                 `json:"gatewayId"`
	Status       string                 `json:"status"`
	Result       map[string]interface{} `json:"result,omitempty"`
	ErrorMessage string                 `json:"errorMessage,omitempty"`
}

func NewIngressClient(baseURL string) *IngressClient {
	return &IngressClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (c *IngressClient) Enroll(token, hostname, ip, version string) (*EnrollResponse, error) {
	reqBody := EnrollRequest{
		Token:    token,
		Hostname: hostname,
		IpAddress: ip,
		Version:  version,
	}

	data, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Post(fmt.Sprintf("%s/ingress/gateway/enroll", c.baseURL), "application/json", bytes.NewBuffer(data))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("enrollment failed (status %d): %s", resp.StatusCode, string(body))
	}

	var enrollResp EnrollResponse
	if err := json.NewDecoder(resp.Body).Decode(&enrollResp); err != nil {
		return nil, err
	}

	return &enrollResp, nil
}

func (c *IngressClient) SendHeartbeat(gatewayID, ip, version string, activeCerts int, cpu, mem float64) (*HeartbeatResponse, error) {
	reqBody := HeartbeatRequest{
		GatewayID:        gatewayID,
		Version:          version,
		IpAddress:        ip,
		ActiveCertsCount: activeCerts,
		Metrics: map[string]float64{
			"cpuUsage": cpu,
			"memoryMb": mem,
		},
	}

	data, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Post(fmt.Sprintf("%s/ingress/gateway/heartbeat", c.baseURL), "application/json", bytes.NewBuffer(data))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("heartbeat failed with status %d", resp.StatusCode)
	}

	var hbResp HeartbeatResponse
	if err := json.NewDecoder(resp.Body).Decode(&hbResp); err != nil {
		return nil, err
	}

	return &hbResp, nil
}

func (c *IngressClient) AcknowledgeCommand(commandID, gatewayID, status string, result map[string]interface{}, errorMsg string) error {
	reqBody := CommandAckRequest{
		CommandID:    commandID,
		GatewayID:    gatewayID,
		Status:       status,
		Result:       result,
		ErrorMessage: errorMsg,
	}

	data, err := json.Marshal(reqBody)
	if err != nil {
		return err
	}

	resp, err := c.httpClient.Post(fmt.Sprintf("%s/ingress/gateway/command-ack", c.baseURL), "application/json", bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("command ack failed with status %d", resp.StatusCode)
	}

	return nil
}

