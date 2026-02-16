# VM Requirements for Production Validation

## Overview

This document outlines the VM requirements for comprehensive production validation testing of the PatchIQ agent across all supported platforms.

**Total VMs Required:** 21 systems
**Estimated Cloud Cost:** $500-800/week (spot instances)
**Testing Duration:** 2 weeks

---

## Platform Matrix

### Windows VMs (4 systems)

| Platform | Version | Architecture | Purpose | Cloud Provider |
|----------|---------|--------------|---------|----------------|
| Windows 10 Pro | 21H2 | amd64 | Desktop OS validation | AWS EC2, Azure, GCP |
| Windows 11 Pro | 22H2 | amd64 | Modern desktop validation | AWS EC2, Azure, GCP |
| Windows Server 2019 | Standard | amd64 | Server OS validation | AWS EC2, Azure, GCP |
| Windows Server 2022 | Standard | amd64 | Modern server validation | AWS EC2, Azure, GCP |

**Recommended Specs:**
- **vCPUs:** 2
- **RAM:** 4 GB
- **Disk:** 50 GB
- **Instance Type (AWS):** t3.medium

**Required Software:**
- PowerShell 5.1+
- Windows Update enabled
- Windows Defender enabled

---

### macOS VMs/Systems (6 systems)

| Platform | Version | Architecture | Purpose | Cloud Provider |
|----------|---------|--------------|---------|----------------|
| macOS 12 Monterey | Latest | Intel (x86_64) | Legacy Intel validation | MacStadium, AWS EC2 Mac |
| macOS 13 Ventura | Latest | Intel (x86_64) | Current Intel validation | MacStadium, AWS EC2 Mac |
| macOS 13 Ventura | Latest | Apple Silicon (arm64) | Apple Silicon validation | Physical hardware required |
| macOS 14 Sonoma | Latest | Intel (x86_64) | Modern Intel validation | MacStadium, AWS EC2 Mac |
| macOS 14 Sonoma | Latest | Apple Silicon (arm64) | Modern Apple Silicon validation | Physical hardware required |
| macOS 15 Sequoia | Latest | Apple Silicon (arm64) | Latest OS validation | Physical hardware required |

**Recommended Specs:**
- **vCPUs:** 2-4
- **RAM:** 8 GB (macOS minimum)
- **Disk:** 100 GB
- **Instance Type (AWS):** mac2.metal (Intel), mac2-m2.metal (ARM)

**Required Software:**
- Homebrew (for testing brew executor)
- Xcode Command Line Tools
- System Integrity Protection enabled

**macOS Testing Challenges:**
- Apple Silicon requires physical hardware or specialized cloud
- AWS EC2 Mac instances require 24-hour minimum allocation
- MacStadium offers dedicated Mac hosting
- Cost: $100-200/month per Mac instance

---

### Linux VMs (11 systems)

#### Ubuntu (3 systems)

| Platform | Version | Architecture | Purpose | Cloud Provider |
|----------|---------|--------------|---------|----------------|
| Ubuntu 20.04 LTS | Latest | amd64 | LTS validation | AWS EC2, Azure, GCP |
| Ubuntu 22.04 LTS | Latest | amd64 | Current LTS validation | AWS EC2, Azure, GCP |
| Ubuntu 24.04 LTS | Latest | amd64 | Latest LTS validation | AWS EC2, Azure, GCP |

**Package Manager:** apt
**Init System:** systemd

#### Debian (2 systems)

| Platform | Version | Architecture | Purpose | Cloud Provider |
|----------|---------|--------------|---------|----------------|
| Debian 11 (Bullseye) | Latest | amd64 | Debian validation | AWS EC2, Azure, GCP |
| Debian 12 (Bookworm) | Latest | amd64 | Latest Debian validation | AWS EC2, Azure, GCP |

**Package Manager:** apt
**Init System:** systemd

#### RHEL (2 systems)

| Platform | Version | Architecture | Purpose | Cloud Provider |
|----------|---------|--------------|---------|----------------|
| RHEL 8 | Latest | amd64 | Enterprise Linux validation | AWS EC2, Azure, GCP |
| RHEL 9 | Latest | amd64 | Latest RHEL validation | AWS EC2, Azure, GCP |

**Package Manager:** yum/dnf
**Init System:** systemd
**Subscription:** Free Developer Subscription available

#### Fedora (2 systems)

| Platform | Version | Architecture | Purpose | Cloud Provider |
|----------|---------|--------------|---------|----------------|
| Fedora 39 | Latest | amd64 | Fedora validation | AWS EC2, Azure, GCP |
| Fedora 40 | Latest | amd64 | Latest Fedora validation | AWS EC2, Azure, GCP |

**Package Manager:** dnf
**Init System:** systemd

**Linux Recommended Specs:**
- **vCPUs:** 2
- **RAM:** 2 GB
- **Disk:** 20 GB
- **Instance Type (AWS):** t3.small

---

## Cloud Provider Options

### AWS EC2

**Pros:**
- Widest platform coverage (Windows, Linux, macOS)
- Spot instances available for cost savings
- EC2 Mac instances available (24-hour minimum)
- Easy automation via AWS CLI/SDK

**Cons:**
- macOS instances expensive ($1.10/hour)
- 24-hour minimum allocation for Mac

**Recommended Instance Types:**
- Windows: `t3.medium` (2 vCPU, 4 GB RAM) - $0.0416/hour
- Linux: `t3.small` (2 vCPU, 2 GB RAM) - $0.0208/hour
- macOS Intel: `mac2.metal` (8 vCPU, 32 GB RAM) - $1.083/hour
- macOS ARM: `mac2-m2.metal` (8 vCPU, 16 GB RAM) - $0.65/hour

**Spot Instance Savings:** 50-70% off on-demand pricing for Windows/Linux

### Azure VMs

**Pros:**
- Good Windows support (Azure owned by Microsoft)
- Linux support
- Spot VMs available

**Cons:**
- No macOS support
- Slightly more expensive than AWS

**Recommended Instance Types:**
- Windows: `Standard_B2s` (2 vCPU, 4 GB RAM)
- Linux: `Standard_B1s` (1 vCPU, 1 GB RAM)

### GCP Compute Engine

**Pros:**
- Competitive pricing
- Preemptible VMs for cost savings
- Good Linux support

**Cons:**
- No macOS support
- Fewer Windows AMIs

**Recommended Instance Types:**
- Windows: `n1-standard-2` (2 vCPU, 7.5 GB RAM)
- Linux: `e2-small` (2 vCPU, 2 GB RAM)

### MacStadium

**Dedicated macOS hosting**

**Pros:**
- Dedicated Mac hardware
- All macOS versions available
- Apple Silicon and Intel
- No minimum allocation period

**Cons:**
- More expensive than AWS
- Requires monthly commitment
- Manual provisioning

**Pricing:**
- Mac mini (M1): $79-119/month
- Mac Studio: $149-299/month

### Physical Hardware

**For Apple Silicon testing**

**Pros:**
- Full control
- No ongoing costs
- Best performance

**Cons:**
- Requires physical access
- Manual setup and teardown
- Not easily automated

**Recommended:**
- Mac mini M2 (for arm64 testing)
- Use for final validation only

---

## Cost Estimation

### AWS EC2 (Primary Recommendation)

**Assumptions:**
- 2-week testing period (336 hours)
- Spot instances for Windows/Linux (60% discount)
- On-demand for macOS (no spot available)

**Windows (4 VMs):**
- Instance: t3.medium
- On-demand: $0.0416/hour
- Spot: ~$0.0166/hour
- Total: 4 × $0.0166 × 336 = **$22.30**

**Linux (11 VMs):**
- Instance: t3.small
- On-demand: $0.0208/hour
- Spot: ~$0.0083/hour
- Total: 11 × $0.0083 × 336 = **$30.67**

**macOS (6 VMs):**
- 3 Intel (mac2.metal): $1.083/hour × 24 hours × 14 days × 3 = **$1,091.66**
- 3 ARM (mac2-m2.metal): $0.65/hour × 24 hours × 14 days × 3 = **$655.20**

**Total AWS Cost:** $1,799.83 for 2 weeks

**Optimization:**
- Use macOS VMs only when actively testing (8 hours/day instead of 24/7)
- Optimized macOS cost: (3 × $1.083 + 3 × $0.65) × 8 × 14 = **$193.86**

**Optimized Total:** $22.30 + $30.67 + $193.86 = **$246.83 for 2 weeks**

### Alternative: MacStadium for macOS

**MacStadium (6 Macs):**
- 3 Intel Mac mini: $89/month × 3 = $267
- 3 ARM Mac mini: $79/month × 3 = $237
- Total: **$504/month** (prorated ~$250 for 2 weeks)

**Hybrid Approach (Recommended):**
- AWS for Windows/Linux: **$53**
- MacStadium for macOS: **$250**
- **Total: $303 for 2 weeks**

---

## VM Provisioning Scripts

### AWS EC2 (via Terraform)

**File: `test/infrastructure/aws-provision.tf`**

```hcl
# See test/infrastructure/ directory for full Terraform scripts
# Provisions all 21 VMs with appropriate instance types
# Configures security groups for agent communication
# Outputs VM IPs and SSH keys
```

### Manual Provisioning Steps

**1. AWS Console:**
- Navigate to EC2 > Launch Instance
- Select AMI (Ubuntu 22.04, Windows Server 2022, etc.)
- Choose instance type (t3.small, t3.medium)
- Configure security group (allow 22/3389, 4504)
- Launch and save key pair

**2. Initial Setup:**

```bash
# Linux
ssh -i key.pem ubuntu@<instance-ip>
sudo apt update && sudo apt upgrade -y

# Windows (RDP)
# Connect via Remote Desktop
# Enable WinRM for remote management
```

**3. Backend Configuration:**
- Update backend `.env` with PUBLIC_URL
- Ensure backend is accessible from VMs
- Configure MinIO for package storage

---

## Network Requirements

### Security Group Rules

**Inbound:**
- Port 22 (SSH) - For Linux/macOS management
- Port 3389 (RDP) - For Windows management
- Port 4504 (Agent WebUI) - For testing agent UI
- Port 443 (HTTPS) - For backend communication

**Outbound:**
- All traffic (agent needs to reach backend/MinIO)

### Backend Accessibility

**Options:**

1. **Public Backend (Simplest):**
   - Deploy backend to cloud with public IP
   - Configure DNS or use IP directly
   - Secure with authentication

2. **VPN/Bastion:**
   - Use VPN or bastion host
   - More secure but complex setup

3. **Local Backend with ngrok:**
   - Run backend locally
   - Expose via ngrok
   - Good for development testing

**Recommended:** Public backend on AWS/Azure with proper authentication

---

## Pre-requisites Checklist

Before starting VM testing:

- [ ] Backend deployed and accessible via HTTPS
- [ ] MinIO configured with test packages
- [ ] All installers built (MSI, PKG, DEB, RPM)
- [ ] Test packages created (see test/fixtures/test-packages.json)
- [ ] Test scripts uploaded to MinIO
- [ ] VM credentials documented
- [ ] SSH keys generated and stored
- [ ] Security groups configured
- [ ] Test automation scripts ready

---

## VM Access Documentation

**File: `test/e2e/VM-ACCESS.md` (Create after provisioning)**

```markdown
# VM Access Credentials

## Windows VMs
- Windows 10: IP, Administrator password
- Windows 11: IP, Administrator password
- Server 2019: IP, Administrator password
- Server 2022: IP, Administrator password

## macOS VMs
- macOS 12 Intel: IP, SSH key path
- macOS 13 Intel: IP, SSH key path
- macOS 13 ARM: IP, SSH key path
- macOS 14 Intel: IP, SSH key path
- macOS 14 ARM: IP, SSH key path
- macOS 15 ARM: IP, SSH key path

## Linux VMs
- Ubuntu 20.04: IP, SSH key path
- Ubuntu 22.04: IP, SSH key path
- Ubuntu 24.04: IP, SSH key path
- Debian 11: IP, SSH key path
- Debian 12: IP, SSH key path
- RHEL 8: IP, SSH key path
- RHEL 9: IP, SSH key path
- Fedora 39: IP, SSH key path
- Fedora 40: IP, SSH key path
```

---

## Testing Workflow

1. **Provision VMs** (Day 1)
   - Launch all 21 VMs
   - Configure networking
   - Document access credentials
   - Verify backend connectivity

2. **Fresh Install Testing** (Days 2-4)
   - Run test/e2e/fresh-install-test.sh on each VM
   - Document results in test/e2e/results/
   - Fix any issues found

3. **Deployment Testing** (Days 5-7)
   - Deploy test packages
   - Test all executors
   - Test rollback scenarios

4. **Self-Update Testing** (Days 8-9)
   - Test update mechanism
   - Test phased rollout
   - Verify rollback

5. **Scale/Load Testing** (Days 10-12)
   - Deploy 30+ agents
   - Trigger 100 concurrent deployments
   - Monitor performance

6. **Cleanup** (Day 14)
   - Terminate all VMs
   - Archive test results
   - Calculate actual costs

---

## Automation Recommendations

**Use Terraform/Ansible for:**
- VM provisioning (Infrastructure as Code)
- Initial VM configuration
- Agent installation
- Test execution

**Use CI/CD for:**
- Automated test execution
- Results collection
- Slack/email notifications

**Sample Terraform:**
```bash
cd test/infrastructure
terraform init
terraform plan -out=plan.tfplan
terraform apply plan.tfplan
# Outputs VM IPs and credentials
```

---

## Known Limitations

**macOS:**
- AWS EC2 Mac requires 24-hour minimum allocation
- Apple Silicon requires physical hardware or MacStadium
- Expensive compared to other platforms

**Windows:**
- RDP required for GUI testing
- Slower startup than Linux
- Requires license (included in cloud pricing)

**RHEL:**
- Requires Red Hat subscription (free developer available)
- More strict SELinux policies may need adjustment

**Networking:**
- VMs must reach backend (firewall rules)
- MinIO download speeds vary by region
- Latency affects test results

---

## Success Metrics

**VM Provisioning:**
- All 21 VMs provisioned within 4 hours
- All VMs accessible via SSH/RDP
- All VMs can reach backend

**Cost Control:**
- Actual cost within 20% of estimate
- No VMs left running after testing
- Spot instances used where possible

**Testing Efficiency:**
- Fresh install tested on all platforms within 2 days
- Deployment testing completed within 3 days
- All results documented

---

## References

- AWS EC2 Pricing: https://aws.amazon.com/ec2/pricing/
- Azure VM Pricing: https://azure.microsoft.com/pricing/details/virtual-machines/
- GCP Pricing: https://cloud.google.com/compute/pricing
- MacStadium: https://www.macstadium.com/pricing
- AWS EC2 Mac: https://aws.amazon.com/ec2/instance-types/mac/

---

**Document Version:** 1.0
**Last Updated:** 2026-02-14
**Owner:** Pipeline 7 - Production Validation
