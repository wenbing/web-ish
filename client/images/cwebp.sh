#!/bin/bash

set -x

for file in client/images/*.jpeg; do cwebp "$file" -o "${file%.*}.webp"; done