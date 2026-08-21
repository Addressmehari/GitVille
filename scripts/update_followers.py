import os
import sys
import json
import urllib.request
import urllib.error
import subprocess

def get_followers(username, token=None):
    followers = []
    page = 1
    per_page = 100
    print(f"Fetching followers for GitHub user: {username}...")
    
    while True:
        url = f"https://api.github.com/users/{username}/followers?page={page}&per_page={per_page}"
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "GitVille-Follower-Sync")
        req.add_header("Accept", "application/vnd.github+json")
        if token:
            req.add_header("Authorization", f"token {token}")
            
        try:
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode('utf-8'))
                if not data:
                    break
                for follower in data:
                    if 'login' in follower:
                        followers.append(follower['login'])
                print(f"Page {page}: found {len(data)} followers.")
                if len(data) < per_page:
                    break
                page += 1
        except urllib.error.HTTPError as e:
            print(f"HTTP Error fetching followers: {e.code} - {e.reason}")
            # Read error message if available
            try:
                error_details = e.read().decode('utf-8')
                print(f"Details: {error_details}")
            except Exception:
                pass
            sys.exit(1)
        except Exception as e:
            print(f"Unexpected error fetching followers: {e}")
            sys.exit(1)
            
    return followers

def main():
    # Read workspace paths relative to this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_dir = os.path.dirname(script_dir)
    file_path = os.path.join(workspace_dir, "test_names.txt")
    
    # Get configuration from environment variables
    username = os.environ.get("REPO_OWNER")
    token = os.environ.get("GITHUB_TOKEN")
    
    if not username:
        print("Error: REPO_OWNER environment variable is not set.")
        sys.exit(1)
        
    # Get followers from API
    followers = get_followers(username, token)
    print(f"Total followers found: {len(followers)}")
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}. Creating a new one.")
        existing_names = []
        raw_content = ""
    else:
        with open(file_path, 'r', encoding='utf-8') as f:
            raw_content = f.read()
        existing_names = [n.strip() for n in raw_content.replace(',', '\n').split('\n') if n.strip()]
        
    existing_lower = {name.lower() for name in existing_names}
    
    # Identify new followers
    new_followers = []
    for f in followers:
        if f.lower() not in existing_lower:
            new_followers.append(f)
            
    if not new_followers:
        print("No new followers found. test_names.txt is up to date.")
        return
        
    print(f"New followers to add: {', '.join(new_followers)}")
    
    # Append new followers to the file
    with open(file_path, 'a', encoding='utf-8') as f:
        # Ensure we start on a new line if file doesn't end with a newline
        if raw_content and not raw_content.endswith('\n'):
            f.write('\n')
        f.write(",".join(new_followers) + ",\n")
        
    print("Updated test_names.txt successfully.")

if __name__ == "__main__":
    main()
