#!/bin/bash
# Iron Lab — Deploy to nvidia-vultr (155.138.207.23)
# Usage: ./deploy.sh
set -e

REMOTE_USER="root"
REMOTE_HOST="155.138.207.23"
REMOTE_DIR="/opt/ironlab"
IMAGE_NAME="ironlab"
ARCHIVE="/tmp/ironlab-image.tar"

echo "==> Building Docker image..."
docker build -t $IMAGE_NAME:latest .

echo "==> Saving image to archive..."
docker save $IMAGE_NAME:latest -o $ARCHIVE

echo "==> Transferring image to server..."
scp $ARCHIVE $REMOTE_USER@$REMOTE_HOST:/tmp/ironlab-image.tar

echo "==> Deploying on server..."
ssh $REMOTE_USER@$REMOTE_HOST << 'ENDSSH'
  set -e
  echo "  -> Loading Docker image..."
  docker load -i /tmp/ironlab-image.tar
  rm /tmp/ironlab-image.tar

  echo "  -> Creating app directory..."
  mkdir -p /opt/ironlab

  echo "  -> Stopping existing container (if any)..."
  docker stop ironlab 2>/dev/null || true
  docker rm ironlab 2>/dev/null || true

  echo "  -> Starting new container..."
  cd /opt/ironlab
  docker compose up -d

  echo "  -> Container status:"
  docker ps | grep ironlab
ENDSSH

echo "==> Cleaning up local archive..."
rm -f $ARCHIVE

echo ""
echo "✅ Deployment complete! Iron Lab is running at https://ironlab.thisisus.ai"
