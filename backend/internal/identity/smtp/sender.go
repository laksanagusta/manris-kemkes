// Package smtp delivers Manrisk transactional email over authenticated TLS.
package smtp

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/mail"
	"net/smtp"
	"strconv"
	"strings"
	"time"
)

var (
	ErrAuthentication    = errors.New("smtp authentication failed")
	ErrRecipientRejected = errors.New("smtp recipient rejected")
)

type Config struct {
	Address, Mode, From, Username, Password string
}

type Sender struct {
	config Config
	host   string
}

func New(config Config) (*Sender, error) {
	host, port, err := net.SplitHostPort(config.Address)
	portNumber, portErr := strconv.Atoi(port)
	if err != nil || host == "" || portErr != nil || portNumber < 1 || portNumber > 65535 {
		return nil, errors.New("AUTH_SMTP_ADDR must contain a host and numeric port")
	}
	if config.Mode != "starttls" && config.Mode != "tls" {
		return nil, errors.New("AUTH_SMTP_MODE must be starttls or tls")
	}
	if (config.Username == "") != (config.Password == "") {
		return nil, errors.New("AUTH_SMTP_USERNAME and AUTH_SMTP_PASSWORD must be configured together")
	}
	from, err := mail.ParseAddress(config.From)
	if err != nil || from.Address != config.From || strings.ContainsAny(config.From, "\r\n") {
		return nil, errors.New("AUTH_SMTP_FROM must be a single email address")
	}
	return &Sender{config: config, host: host}, nil
}

func (s *Sender) Send(ctx context.Context, recipient, subject, textBody, htmlBody string) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	to, err := mail.ParseAddress(recipient)
	if err != nil || to.Address != recipient || strings.ContainsAny(recipient+subject, "\r\n") {
		return errors.New("invalid transactional email headers")
	}

	tlsConfig := &tls.Config{ServerName: s.host, MinVersion: tls.VersionTLS12}
	var conn net.Conn
	if s.config.Mode == "tls" {
		dialer := &tls.Dialer{Config: tlsConfig}
		conn, err = dialer.DialContext(ctx, "tcp", s.config.Address)
	} else {
		var dialer net.Dialer
		conn, err = dialer.DialContext(ctx, "tcp", s.config.Address)
	}
	if err != nil {
		return err
	}
	defer conn.Close()
	stop := context.AfterFunc(ctx, func() { _ = conn.Close() })
	defer stop()

	client, err := smtp.NewClient(conn, s.host)
	if err != nil {
		return err
	}
	defer client.Close()

	if s.config.Mode == "starttls" {
		if err := client.StartTLS(tlsConfig); err != nil {
			return err
		}
	}
	if s.config.Username != "" {
		if err := client.Auth(smtp.PlainAuth("", s.config.Username, s.config.Password, s.host)); err != nil {
			return fmt.Errorf("%w: %w", ErrAuthentication, err)
		}
	}
	if err := client.Mail(s.config.From); err != nil {
		return err
	}
	if err := client.Rcpt(recipient); err != nil {
		return fmt.Errorf("%w: %w", ErrRecipientRejected, err)
	}
	message, err := client.Data()
	if err != nil {
		return err
	}
	if err := writeMessage(message, s.config.From, recipient, subject, textBody, htmlBody, time.Now()); err != nil {
		return err
	}
	if err := message.Close(); err != nil {
		return err
	}
	_ = client.Quit()
	return nil
}
