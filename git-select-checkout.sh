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

# Check for local changes
if [[ -n $(git status --porcelain) ]]; then
    echo "=========================================="
    echo " WARNING: Local changes detected!"
    echo "=========================================="
    git status --short
    echo ""
    read -p "Do you want to stash these changes before switching branches? (y/N): " stash_choice
    if [[ "$stash_choice" =~ ^[Yy]$ ]]; then
        echo "Stashing changes..."
        git stash push -m "Auto-stash by git-select-checkout.sh before switching to $selected"
    else
        echo "⚠️  Proceeding without stashing. This might cause conflicts."
    fi
fi
# Checkout + auto-create local branch
echo "Running: git checkout -b $selected origin/$selected"
git checkout -b "$selected" "origin/$selected"

# Pull latest
echo "Running: git pull"
git pull

echo "Done!"
