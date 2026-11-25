#!/usr/bin/env bash
# Claude Code status line — shows context window usage to help monitor when to /handoff and /clear.

input=$(cat)

if command -v jq >/dev/null 2>&1; then
    used=$(printf '%s' "$input" | jq -r '.context_window.used_percentage // empty')
    model=$(printf '%s' "$input" | jq -r '.model.display_name // empty')
    cwd=$(printf '%s' "$input" | jq -r '.workspace.current_dir // .cwd // empty')
elif command -v node >/dev/null 2>&1; then
    parsed=$(printf '%s' "$input" | node -e '
      let s = "";
      process.stdin.on("data", c => s += c);
      process.stdin.on("end", () => {
        try {
          const d = JSON.parse(s || "{}");
          const used = d.context_window?.used_percentage ?? "";
          const model = d.model?.display_name ?? "";
          const cwd = d.workspace?.current_dir ?? d.cwd ?? "";
          process.stdout.write([used, model, cwd].join("\t"));
        } catch {
          process.stdout.write("\t\t");
        }
      });
    ')
    IFS=$'\t' read -r used model cwd <<< "$parsed"
else
    used=""
    model=""
    cwd=""
fi

home="$HOME"
cwd="${cwd/#$home/\~}"

if [ -n "$used" ]; then
    used_int=${used%.*}

    if [ "$used_int" -ge 85 ]; then
        ctx_color="\033[31m"
        ctx_label="ctx ${used_int}% (/handoff & /clear!)"
    elif [ "$used_int" -ge 70 ]; then
        ctx_color="\033[33m"
        ctx_label="ctx ${used_int}% (/handoff)"
    elif [ "$used_int" -ge 50 ]; then
        ctx_color="\033[36m"
        ctx_label="ctx ${used_int}%"
    else
        ctx_color="\033[32m"
        ctx_label="ctx ${used_int}%"
    fi

    reset="\033[0m"
    dim="\033[2m"

    printf "${dim}%s${reset}  ${ctx_color}%s${reset}  ${dim}%s${reset}" \
        "$cwd" \
        "$ctx_label" \
        "$model"
else
    dim="\033[2m"
    reset="\033[0m"
    printf "${dim}%s  %s${reset}" "$cwd" "$model"
fi
