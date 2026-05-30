# Cloud Deployment & VPS Configuration Guide

This guide details instructions to set up an Ubuntu 24.04 VPS for signaling and STUN/TURN traversal, configure firewalls for AWS/Azure Windows Server VMs, and establish secure paths for RDP traffic.

---

## 1. VPS coturn (STUN/TURN) Server Configuration
If the Android TV and Mobile Controller are on different networks (e.g., Cellular vs Home WiFi), standard NAT boundaries prevent direct UDP socket delivery. A STUN/TURN server resolves their public addresses.

### Installing coturn on Ubuntu 24.04 LTS
Run the following commands on your signaling VPS:

```bash
# Update repositories and install coturn
sudo apt update && sudo apt install -y coturn

# Stop the default auto-running service to customize config
sudo systemctl stop coturn
```

### Configuring `/etc/turnserver.conf`
Modify the configuration file:

```ini
# Main server configuration
listening-port=3478
tls-port=5349

# Use the public IP of your Ubuntu VPS here
external-ip=YOUR_VPS_PUBLIC_IP
listening-ip=0.0.0.0

# Security & Authentication settings
fingerprint
lt-cred-mech
user=toxicrdp:SecureSharedPassword123!
realm=toxic.rdp.vps

# Performance & Logging
syslog
verbose
```

### Enabling and Starting coturn
Enable coturn at boot:

```bash
# Enable the service in system configuration
sudo sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn

# Start and verify
sudo systemctl daemon-reload
sudo systemctl start coturn
sudo systemctl enable coturn
sudo systemctl status coturn
```

---

## 2. Cloud Firewalls & Security Groups

To connect safely to Windows Server RDP targets deployed on AWS (EC2) or Azure (Virtual Machines), adjust security credentials in their control consoles.

### AWS Security Group Rules
For your target EC2 instance:

| Protocol | Port Range | Source | Purpose |
| :--- | :--- | :--- | :--- |
| **TCP** | `3389` | `YOUR_TV_PUBLIC_IP/32` or `0.0.0.0/0` | FreeRDP Client TCP Connection |
| **UDP** | `40001` | `YOUR_MOBILE_PUBLIC_IP/32` | UDP Input Bridge directly to TV |
| **UDP** | `3478` | `0.0.0.0/0` | STUN Signaling broker |

> [!CAUTION]
> Avoid keeping `TCP 3389` open to `0.0.0.0/0` (global) permanently to protect against active RDP brute force scanning. Restrict access using single IP addresses or VPN rules.

### Azure Network Security Group (NSG) Rules
For your Azure VM:
1. Navigate to the **Network Settings** of your VM.
2. Select **Add Inbound Security Rule**.
3. Create a rule for RDP:
   - **Destination Port Ranges**: `3389`
   - **Protocol**: `TCP`
   - **Action**: `Allow`
   - **Priority**: `100` (highest rule priority)

---

## 3. Secure Tunneling & WireGuard VPN Fallback
For enterprise deployments, opening RDP ports directly to the internet is highly discouraged. Setup a WireGuard VPN tunnel on the Ubuntu VPS to encapsulate all traffic.

### Quick Setup WireGuard on Ubuntu 24.04

```bash
# Install WireGuard
sudo apt update && sudo apt install -y wireguard

# Generate Server Private & Public Keys
cd /etc/wireguard
umask 077
wg genkey | tee privatekey | wg pubkey > publickey
```

### `/etc/wireguard/wg0.conf` configuration file:

```ini
[Interface]
PrivateKey = <Server_Private_Key>
Address = 10.0.0.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
# Android TV Configuration
PublicKey = <TV_Client_Public_Key>
AllowedIPs = 10.0.0.2/32

[Peer]
# Mobile Phone Configuration
PublicKey = <Mobile_Client_Public_Key>
AllowedIPs = 10.0.0.3/32
```

Start the VPN:
```bash
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0
```

With WireGuard running:
- The Android TV connects to `10.0.0.1` (RDP server tunnel) safely.
- The Mobile Controller transmits relative coordinates directly inside the secure private tunnel `10.0.0.2` without exposing raw UDP packets to the public internet.
