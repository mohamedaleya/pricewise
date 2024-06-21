#!/bin/bash

# Fail immediately if any command exits with a non-zero status
set -euo pipefail

# Enable debug output for troubleshooting
# set -x

set -a  # Automatically export all variables
source .env.production
set +a  # Stop automatically exporting

# Define variables for convenience and readability
IMAGE_NAME="ghcr.io/"$GH_USERNAME"/pricewise"
TAG_VERSION="$NEXT_PUBLIC_VERSION"
TAG_LATEST="latest"
PORT_MAPPING="3000:3000"

# Function to log in to the GitHub Container Registry
docker_login() {
    echo "Logging in to GitHub Container Registry..."
    echo "$GHCR_PAT" | docker login ghcr.io --username "$GH_USERNAME" --password-stdin
}

# Function to build the Docker image
build_image() {
    echo "Building Docker image..."
    docker build . -t "${IMAGE_NAME}:${TAG_VERSION}" && echo "Docker build succeeded." || { echo "Docker build failed."; exit 1; }
}

# Function to tag and push the Docker image
tag_and_push() {
    echo "Tagging and pushing Docker images..."
    docker tag "${IMAGE_NAME}:${TAG_VERSION}" "${IMAGE_NAME}:${TAG_LATEST}"
    docker push "${IMAGE_NAME}:${TAG_VERSION}"
    docker push "${IMAGE_NAME}:${TAG_LATEST}"
}

# Function to deploy the Docker container
deploy_container() {
    echo "Deploying Docker container..."
    ssh -i "~/.ssh/contabo" "$CONTABO_VPS_USERNAME"@"$CONTABO_VPS_IP" <<EOF
    echo "$GHCR_PAT" | docker login ghcr.io --username "$GH_USERNAME" --password-stdin
    docker ps -q --filter "ancestor=${IMAGE_NAME}" | xargs -r docker stop | xargs -r docker rm
    docker pull "${IMAGE_NAME}:${TAG_VERSION}"
    docker tag "${IMAGE_NAME}:${TAG_VERSION}" "${IMAGE_NAME}:${TAG_LATEST}"
    docker run -d -p ${PORT_MAPPING} "${IMAGE_NAME}:${TAG_LATEST}"
EOF
}

# Main script execution
docker_login
build_image
tag_and_push
deploy_container
