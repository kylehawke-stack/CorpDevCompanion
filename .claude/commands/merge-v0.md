Merge the latest changes from the v0 design branch into the current working branch.

Steps:
1. Run `git fetch origin` to get latest remote state
2. Identify the v0 design branch (look for `origin/corpdev-companion-design` or any branch with "design" in the name)
3. If no design branch found, tell the user and stop
4. Show the user what files changed on the v0 branch vs current HEAD: `git diff --stat HEAD...origin/corpdev-companion-design`
5. Run `git merge origin/corpdev-companion-design --no-edit`
6. If there are merge conflicts:
   - List all conflicted files
   - For each conflicted file, read the file and resolve the conflict intelligently:
     - Keep BOTH sides where possible (e.g., new type exports from v0 + existing types from our branch)
     - For App.tsx route additions: include v0's new routes alongside existing ones
     - For WelcomePage.tsx: integrate v0's UI additions (like mockup links) into our current version
     - For types/index.ts: merge type additions from both sides
   - After resolving, stage the files and complete the merge commit
7. Run `npm run build` to verify the merge didn't break anything
8. If build fails, fix the issues and amend the merge commit
9. Show a summary of what was merged

If the argument `$ARGUMENTS` is provided, use it as the branch name instead of auto-detecting.
