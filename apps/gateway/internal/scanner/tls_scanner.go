package scanner

import (
	"crypto/sha256"
	"crypto/tls"
	"encoding/hex"
	"fmt"
	"net"
	"time"
)

type DiscoveredCertificate struct {
	Domain            string    `json:"domain"`
	SANs              []string  `json:"sans"`
	Issuer            string    `json:"issuer"`
	SerialNumber      string    `json:"serialNumber"`
	FingerprintSHA256 string    `json:"fingerprintSha256"`
	NotBefore         time.Time `json:"notBefore"`
	NotAfter          time.Time `json:"notAfter"`
	DaysRemaining     int       `json:"daysRemaining"`
}

type TLSScanner struct {
	dialTimeout time.Duration
}

func NewTLSScanner() *TLSScanner {
	return &TLSScanner{
		dialTimeout: 5 * time.Second,
	}
}

func (s *TLSScanner) ScanTarget(host string, port int) (*DiscoveredCertificate, error) {
	target := fmt.Sprintf("%s:%d", host, port)
	conn, err := tls.DialWithDialer(&net.Dialer{Timeout: s.dialTimeout}, "tcp", target, &tls.Config{
		InsecureSkipVerify: true,
	})
	if err != nil {
		return nil, fmt.Errorf("TLS connection to %s failed: %w", target, err)
	}
	defer conn.Close()

	certs := conn.ConnectionState().PeerCertificates
	if len(certs) == 0 {
		return nil, fmt.Errorf("no peer certificates presented by %s", target)
	}

	leaf := certs[0]
	hash := sha256.Sum256(leaf.Raw)
	fingerprint := hex.EncodeToString(hash[:])
	daysLeft := int(time.Until(leaf.NotAfter).Hours() / 24)

	return &DiscoveredCertificate{
		Domain:            leaf.Subject.CommonName,
		SANs:              leaf.DNSNames,
		Issuer:            leaf.Issuer.CommonName,
		SerialNumber:      leaf.SerialNumber.Text(16),
		FingerprintSHA256: fingerprint,
		NotBefore:         leaf.NotBefore,
		NotAfter:          leaf.NotAfter,
		DaysRemaining:     daysLeft,
	}, nil
}

