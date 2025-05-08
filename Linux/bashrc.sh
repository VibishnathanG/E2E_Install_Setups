# Function to show last 2 directories in path
short_pwd() {
  pwd | awk -F/ '{n=NF-1; print $(n) "/" $NF}'
}

# Function to get current git branch name
parse_git_branch() {
  git rev-parse --abbrev-ref HEAD 2>/dev/null
}

# Prompt setup
export PS1='\[\e[1;32m\]\u@\h \[\e[1;34m\]$(short_pwd) \[\e[0;36m\]($(parse_git_branch)) \[\e[1;33m\]> \[\e[0m\]'

hostname
date
echo "Working Dir Changed Stay Consistent and Work Hard !!!"

alias ll='ls -lrt'
#provide valid working Dir
cd  /e/Personal/Self-Placed/Main_Workspace/Devops