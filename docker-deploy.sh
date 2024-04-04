#!/bin/bash

set -ex

# Define variables for convenience and readability
IMAGE_NAME="ghcr.io/mohamedaleya/pricewise"
TAG_VERSION="0.0.5"
TAG_LATEST="latest"

# Build the Docker image
docker build . -t $IMAGE_NAME:$TAG_VERSION

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "Docker build succeeded."
else
    echo "Docker build failed."
    exit 1
fi

# Tag the Docker image with the latest tag
docker tag $IMAGE_NAME:$TAG_VERSION $IMAGE_NAME:$TAG_LATEST

# Push the image to the registry
docker push $IMAGE_NAME:$TAG_VERSION 
docker push $IMAGE_NAME:$TAG_LATEST
