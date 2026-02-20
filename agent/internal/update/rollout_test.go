package update

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestShouldUpdate_100Percent(t *testing.T) {
	t.Parallel()
	assert.True(t, ShouldUpdate("any-agent-id", 100))
}

func TestShouldUpdate_0Percent(t *testing.T) {
	t.Parallel()
	assert.False(t, ShouldUpdate("any-agent-id", 0))
}

func TestShouldUpdate_Deterministic(t *testing.T) {
	t.Parallel()

	agentID := "test-agent-abc123"
	// Call multiple times - should always return same result
	first := ShouldUpdate(agentID, 50)
	for i := 0; i < 10; i++ {
		assert.Equal(t, first, ShouldUpdate(agentID, 50))
	}
}

func TestShouldUpdate_Distribution(t *testing.T) {
	t.Parallel()

	// With 50% rollout and enough agents, distribution should be roughly half
	total := 1000
	selected := 0
	for i := 0; i < total; i++ {
		agentID := fmt.Sprintf("agent-%d", i)
		if ShouldUpdate(agentID, 50) {
			selected++
		}
	}

	// Allow wide range for randomness: expect between 35% and 65%
	pct := float64(selected) / float64(total) * 100
	assert.Greater(t, pct, 35.0, "too few agents selected")
	assert.Less(t, pct, 65.0, "too many agents selected")
}

func TestValidateDeploymentGroup_Valid(t *testing.T) {
	t.Parallel()

	assert.True(t, ValidateDeploymentGroup("canary"))
	assert.True(t, ValidateDeploymentGroup("beta"))
	assert.True(t, ValidateDeploymentGroup("production"))
}

func TestValidateDeploymentGroup_Invalid(t *testing.T) {
	t.Parallel()

	assert.False(t, ValidateDeploymentGroup(""))
	assert.False(t, ValidateDeploymentGroup("staging"))
	assert.False(t, ValidateDeploymentGroup("alpha"))
}

func TestEvaluateRollout_ManualOverride(t *testing.T) {
	t.Parallel()

	config := RolloutConfig{
		DeploymentGroup:   DeploymentGroupCanary,
		RolloutPercentage: 0, // Would normally be false
		TargetVersion:     "2.0.0",
		CurrentVersion:    "1.0.0",
		ManualOverride:    true,
	}

	shouldUpdate, reason := EvaluateRollout(config, "agent-123")
	assert.True(t, shouldUpdate)
	assert.Contains(t, reason, "manual override")
}

func TestEvaluateRollout_AlreadyOnTargetVersion(t *testing.T) {
	t.Parallel()

	config := RolloutConfig{
		DeploymentGroup:   DeploymentGroupProduction,
		RolloutPercentage: 100,
		TargetVersion:     "1.0.0",
		CurrentVersion:    "1.0.0",
		ManualOverride:    false,
	}

	shouldUpdate, reason := EvaluateRollout(config, "agent-123")
	assert.False(t, shouldUpdate)
	assert.Contains(t, reason, "target version")
}

func TestGetDefaultDeploymentGroup(t *testing.T) {
	t.Parallel()
	assert.Equal(t, DeploymentGroupProduction, GetDefaultDeploymentGroup())
}

func TestDefaultRolloutPhases(t *testing.T) {
	t.Parallel()

	phases := DefaultRolloutPhases()
	assert.Len(t, phases, 4)
}
