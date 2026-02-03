#!/bin/bash

echo "=============================="
echo "   Select a local branch to push"
echo "=============================="

# Get local branch names
branches=($(git branch --format='%(refname:short)'))

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

echo ""
read -p "Do you want to commit changes before pushing? (y/n) " commit_confirm

if [[ "$commit_confirm" == "y" || "$commit_confirm" == "Y" ]]; then
    read -p "Enter commit message: " message
    if [[ -n "$message" ]]; then
        echo "Running: git add ."
        git add .
        echo "Running: git commit -m \"$message\""
        git commit -m "$message"
    else
        echo "No commit message provided. Skipping commit."
    fi
fi

# Push to origin
echo "Running: git push -u origin $selected"
git push -u origin "$selected"

echo "Done!"
