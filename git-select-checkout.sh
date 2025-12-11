#!/bin/bash

# Fetch remote branches
git fetch --all

echo "=============================="
echo "   Select a remote branch"
echo "=============================="

# Get only remote branch names (remove origin/, remove HEAD ->)
branches=($(git branch -r | grep -v 'HEAD' | sed 's/origin\///'))

# List branches with numbers
for i in "${!branches[@]}"; do
    echo "$((i+1)). ${branches[$i]}"
done

echo ""
read -p "Enter branch number: " choice

# Validation
if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ $choice -le 0 ] || [ $choice -gt ${#branches[@]} ]; then
    echo "Invalid selection!"
    exit 1
fi

selected="${branches[$((choice-1))]}"
echo "Selected: $selected"

# Checkout + auto-create local branch
echo "Running: git checkout -b $selected origin/$selected"
git checkout -b "$selected" "origin/$selected"

# Pull latest
echo "Running: git pull"
git pull

echo "Done!"
