package update

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"

	"github.com/rs/zerolog/log"
)

// DeploymentGroup represents the rollout group for an agent
type DeploymentGroup string

const (
	DeploymentGroupCanary     DeploymentGroup = "canary"
	DeploymentGroupBeta       DeploymentGroup = "beta"
	DeploymentGroupProduction DeploymentGroup = "production"
)

// RolloutConfig contains configuration for phased rollouts
type RolloutConfig struct {
	DeploymentGroup    DeploymentGroup
	RolloutPercentage  int    // 0-100, percentage of agents that should update
	TargetVersion      string
	CurrentVersion     string
	ManualOverride     bool   // Force update regardless of rollout group
}

// ShouldUpdate determines if an agent should update based on rollout configuration
// Uses consistent hash-based bucketing so the same agent always gets the same result
func ShouldUpdate(agentID string, rolloutPercentage int) bool {
	if rolloutPercentage <= 0 {
		log.Debug().
			Int("rolloutPercentage", rolloutPercentage).
			Msg("Rollout percentage is 0 - skipping update")
		return false
	}

	if rolloutPercentage >= 100 {
		log.Debug().Msg("Rollout percentage is 100 - updating")
		return true
	}

	// Calculate consistent hash bucket for this agent
	bucket := hashAgentToBucket(agentID)

	shouldUpdate := bucket < rolloutPercentage

	log.Debug().
		Str("agentId", agentID).
		Int("bucket", bucket).
		Int("rolloutPercentage", rolloutPercentage).
		Bool("shouldUpdate", shouldUpdate).
		Msg("Evaluated rollout bucket assignment")

	return shouldUpdate
}

// hashAgentToBucket maps an agent ID to a bucket from 0-99
// Uses SHA256 hash to ensure consistent, uniform distribution
func hashAgentToBucket(agentID string) int {
	// Hash the agent ID
	hasher := sha256.New()
	hasher.Write([]byte(agentID))
	hashBytes := hasher.Sum(nil)

	// Convert first 8 bytes to an integer
	hashInt := new(big.Int).SetBytes(hashBytes[:8])

	// Mod 100 to get bucket 0-99
	bucket := new(big.Int).Mod(hashInt, big.NewInt(100))

	return int(bucket.Int64())
}

// EvaluateRollout determines if an agent should update based on complete rollout config
func EvaluateRollout(config RolloutConfig, agentID string) (bool, string) {
	// Manual override always updates
	if config.ManualOverride {
		log.Info().Msg("Manual override enabled - forcing update")
		return true, "manual override"
	}

	// If already on target version, don't update
	if config.CurrentVersion == config.TargetVersion {
		log.Debug().
			Str("version", config.CurrentVersion).
			Msg("Already on target version - no update needed")
		return false, "already on target version"
	}

	// Check deployment group and rollout percentage
	shouldUpdate := ShouldUpdate(agentID, config.RolloutPercentage)

	if shouldUpdate {
		reason := fmt.Sprintf("rollout: %s group, %d%% rollout",
			config.DeploymentGroup, config.RolloutPercentage)
		log.Info().
			Str("from", config.CurrentVersion).
			Str("to", config.TargetVersion).
			Str("group", string(config.DeploymentGroup)).
			Int("percentage", config.RolloutPercentage).
			Msg("Agent selected for update")
		return true, reason
	}

	reason := fmt.Sprintf("not in rollout: %s group, %d%% rollout",
		config.DeploymentGroup, config.RolloutPercentage)
	log.Info().
		Str("group", string(config.DeploymentGroup)).
		Int("percentage", config.RolloutPercentage).
		Msg("Agent not selected for update")
	return false, reason
}

// ValidateDeploymentGroup checks if a deployment group is valid
func ValidateDeploymentGroup(group string) bool {
	switch DeploymentGroup(group) {
	case DeploymentGroupCanary, DeploymentGroupBeta, DeploymentGroupProduction:
		return true
	default:
		return false
	}
}

// GetDefaultDeploymentGroup returns the default deployment group
func GetDefaultDeploymentGroup() DeploymentGroup {
	return DeploymentGroupProduction
}

// CalculateRolloutProgress calculates how many agents should be updated
func CalculateRolloutProgress(totalAgents, rolloutPercentage int) int {
	if rolloutPercentage <= 0 {
		return 0
	}
	if rolloutPercentage >= 100 {
		return totalAgents
	}

	return (totalAgents * rolloutPercentage) / 100
}

// GenerateBucketDistribution shows how agents are distributed across buckets
// Useful for testing and debugging rollout logic
func GenerateBucketDistribution(agentIDs []string) map[int][]string {
	distribution := make(map[int][]string)

	for _, agentID := range agentIDs {
		bucket := hashAgentToBucket(agentID)
		distribution[bucket] = append(distribution[bucket], agentID)
	}

	return distribution
}

// LogRolloutStats logs statistics about a rollout
func LogRolloutStats(totalAgents, selectedAgents, rolloutPercentage int) {
	actualPercentage := 0.0
	if totalAgents > 0 {
		actualPercentage = (float64(selectedAgents) / float64(totalAgents)) * 100
	}

	log.Info().
		Int("totalAgents", totalAgents).
		Int("selectedAgents", selectedAgents).
		Int("targetPercentage", rolloutPercentage).
		Float64("actualPercentage", actualPercentage).
		Msg("Rollout statistics")
}

// EncodeAgentID ensures agent ID is suitable for hashing
func EncodeAgentID(agentID string) string {
	// If agent ID is already a valid hex string, use it directly
	if _, err := hex.DecodeString(agentID); err == nil && len(agentID) >= 8 {
		return agentID
	}

	// Otherwise, hash it to create a consistent identifier
	hasher := sha256.New()
	hasher.Write([]byte(agentID))
	return hex.EncodeToString(hasher.Sum(nil))
}

// RolloutPhase represents different phases of a gradual rollout
type RolloutPhase struct {
	Name       string
	Percentage int
	Duration   string // e.g., "24h", "1w"
}

// DefaultRolloutPhases returns a standard 4-phase rollout strategy
func DefaultRolloutPhases() []RolloutPhase {
	return []RolloutPhase{
		{Name: "canary", Percentage: 1, Duration: "24h"},
		{Name: "early", Percentage: 10, Duration: "48h"},
		{Name: "majority", Percentage: 50, Duration: "72h"},
		{Name: "all", Percentage: 100, Duration: "0h"},
	}
}
