#!/bin/bash
set -e   # stop immediately if any command fails — don't continue on a broken step

RESOURCE_GROUP="focusflow-rg"
LOCATION="DenmarkEast"
VM_NAME="focusflow-vm"
VM_SIZE="Standard_B1s"        # free-tier eligible size
ADMIN_USER="azureuser"

# 1. Resource group — a logical container for everything we create
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# 2. The VM itself. --generate-ssh-keys reuses/creates your local SSH keypair automatically.
az vm create \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --image Ubuntu2204 \
  --size $VM_SIZE \
  --admin-username $ADMIN_USER \
  --generate-ssh-keys

# 3. Open port 22 (SSH, for us to deploy) and port 80 (HTTP, for the public app)
az vm open-port --resource-group $RESOURCE_GROUP --name $VM_NAME --port 22 --priority 100
az vm open-port --resource-group $RESOURCE_GROUP --name $VM_NAME --port 80 --priority 110

# 4. Print the public IP so we know where to SSH/browse to
az vm show \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --show-details \
  --query publicIps \
  --output tsv