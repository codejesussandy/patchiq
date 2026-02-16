package logger

import (
	"io"
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Init initializes the global logger with the specified configuration
func Init(level, format, file string) error {
	// Parse log level
	l, err := zerolog.ParseLevel(level)
	if err != nil {
		l = zerolog.InfoLevel // Default to info if invalid
	}
	zerolog.SetGlobalLevel(l)

	// Configure output
	var output io.Writer = os.Stdout
	if file != "" {
		f, err := os.OpenFile(file, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
		if err != nil {
			return err
		}
		output = f
	}

	// Format: text (human-readable) or json (default)
	if format == "text" {
		output = zerolog.ConsoleWriter{
			Out:        output,
			TimeFormat: time.RFC3339,
		}
	}

	// Set global logger
	log.Logger = zerolog.New(output).With().Timestamp().Caller().Logger()
	
	return nil
}

// WithComponent creates a logger with a component name
func WithComponent(component string) zerolog.Logger {
	return log.With().Str("component", component).Logger()
}

// WithCommandID creates a logger with a command ID for correlation
func WithCommandID(commandID string) zerolog.Logger {
	return log.With().Str("commandID", commandID).Logger()
}

// WithFields creates a logger with custom fields
func WithFields(fields map[string]interface{}) zerolog.Logger {
	ctx := log.With()
	for k, v := range fields {
		ctx = ctx.Interface(k, v)
	}
	return ctx.Logger()
}
