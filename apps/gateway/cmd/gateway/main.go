package main

import (
	"log"
	"math/rand"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/clm-platform/gateway/internal/client"
	"github.com/clm-platform/gateway/internal/config"
	"github.com/clm-platform/gateway/internal/deployer"
	"github.com/clm-platform/gateway/internal/scanner"
)

func main() {
	log.Println("Starting CLM Satellite Gateway Daemon v1.0.0...")
	cfg := config.LoadConfig()

	ingressClient := client.NewIngressClient(cfg.ControlPlaneURL)
	tlsScanner := scanner.NewTLSScanner()
	acmDeployer := deployer.NewACMDeployer()

	// 1. Check if enrollment is required
	if cfg.GatewayID == "" && cfg.EnrollmentToken != "" {
		log.Printf("Enrolling gateway daemon with token: %s", cfg.EnrollmentToken)
		resp, err := ingressClient.Enroll(cfg.EnrollmentToken, cfg.Hostname, "10.0.1.15", cfg.Version)
		if err != nil {
			log.Fatalf("Fatal: Enrollment failed: %v", err)
		}
		cfg.GatewayID = resp.GatewayID
		log.Printf("Gateway successfully enrolled with ID: %s for Tenant: %s", resp.GatewayID, resp.TenantID)
	}

	if cfg.GatewayID == "" {
		cfg.GatewayID = "20000000-0000-0000-0000-000000000001"
		log.Printf("Using existing gateway ID: %s", cfg.GatewayID)
	}

	ticker := time.NewTicker(cfg.HeartbeatInterval)
	defer ticker.Stop()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	log.Printf("Gateway %s online. Entering outbound beacon loop (interval: %v)...", cfg.GatewayID, cfg.HeartbeatInterval)

	// Send initial heartbeat immediately
	sendHeartbeat(ingressClient, tlsScanner, acmDeployer, cfg)

	for {
		select {
		case <-ticker.C:
			sendHeartbeat(ingressClient, tlsScanner, acmDeployer, cfg)
		case sig := <-sigChan:
			log.Printf("Received signal %v. Gracefully shutting down gateway daemon.", sig)
			return
		}
	}
}

func sendHeartbeat(c *client.IngressClient, s *scanner.TLSScanner, d *deployer.ACMDeployer, cfg *config.Config) {
	cpu := 1.2 + rand.Float64()*1.5
	mem := 138.0 + rand.Float64()*10.0

	hb, err := c.SendHeartbeat(cfg.GatewayID, "10.0.1.15", cfg.Version, 4, cpu, mem)
	if err != nil {
		log.Printf("[Heartbeat WARN] Failed to beacon control plane: %v", err)
		return
	}

	log.Printf("[Heartbeat ACK] Control plane beacon acknowledged. Pending commands: %d", len(hb.Commands))

	// Execute any queued commands returned by the control plane
	for _, cmd := range hb.Commands {
		log.Printf("Processing command: ID=%s, Type=%s", cmd.ID, cmd.Type)
		switch cmd.Type {
		case "DISCOVER":
			targetHost, _ := cmd.Payload["host"].(string)
			if targetHost == "" {
				targetHost = "localhost"
			}
			cert, err := s.ScanTarget(targetHost, 443)
			if err != nil {
				c.AcknowledgeCommand(cmd.ID, cfg.GatewayID, "FAILED", nil, err.Error())
			} else {
				c.AcknowledgeCommand(cmd.ID, cfg.GatewayID, "COMPLETED", map[string]interface{}{
					"domain":      cert.Domain,
					"sans":        cert.SANs,
					"fingerprint": cert.FingerprintSHA256,
				}, "")
			}
		case "DEPLOY", "DEPLOY_CERT":
			domain, _ := cmd.Payload["domain"].(string)
			target, _ := cmd.Payload["targetType"].(string)
			if target == "" {
				target, _ = cmd.Payload["target"].(string)
			}
			certPEM, _ := cmd.Payload["certificatePem"].(string)
			keyPEM, _ := cmd.Payload["privateKeyPem"].(string)

			log.Printf("[Deploy EXEC] Deploying certificate for %s to target: %s", domain, target)
			res, err := d.DeployCertificate(domain, target, certPEM, keyPEM)
			if err != nil {
				c.AcknowledgeCommand(cmd.ID, cfg.GatewayID, "FAILED", nil, err.Error())
			} else {
				c.AcknowledgeCommand(cmd.ID, cfg.GatewayID, "COMPLETED", map[string]interface{}{
					"status":      res.Status,
					"resourceArn": res.ResourceARN,
					"message":     res.Message,
					"deployedAt":  res.DeployedAt.Format(time.RFC3339),
				}, "")
			}
				c.AcknowledgeCommand(cmd.ID, cfg.GatewayID, "COMPLETED", map[string]interface{}{
					"status":      res.Status,
					"resourceArn": res.ResourceARN,
				}, "")
			}
		}
	}
}

