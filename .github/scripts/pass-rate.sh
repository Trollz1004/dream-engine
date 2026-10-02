#!/usr/bin/env bash
# The 90 percent gate (Joshua Coleman, all Trollz1004 repositories).
# Runs `npm test`, reads the pass and fail counts from the output of either
# Vitest or the Node test runner, and fails the job when fewer than 90 percent
# of the tests pass. Every failing test is named in the job summary.
set -uo pipefail
SUMMARY="${GITHUB_STEP_SUMMARY:-/dev/stdout}"

if [ ! -f package.json ]; then
  echo "## 90 percent gate" >> "$SUMMARY"
  echo "No package.json yet, so there is no engine code to test. Gate passes." >> "$SUMMARY"
  exit 0
fi

npm test 2>&1 | tee test-output.txt
plain=$(sed 's/\x1b\[[0-9;]*m//g' test-output.txt)

# Vitest: "Tests  2 failed | 79 passed (81)"
pass=$(echo "$plain" | grep -E '^\s*Tests\s' | tail -1 | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+')
fail=$(echo "$plain" | grep -E '^\s*Tests\s' | tail -1 | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+')
# Node test runner: "ℹ pass 18" / "ℹ fail 0"
if [ -z "${pass:-}" ]; then
  pass=$(echo "$plain" | grep -E '^ℹ pass [0-9]+' | tail -1 | grep -oE '[0-9]+')
  fail=$(echo "$plain" | grep -E '^ℹ fail [0-9]+' | tail -1 | grep -oE '[0-9]+')
fi
# Node test runner without a terminal (CI) prints TAP: "# pass 18" / "# fail 0"
if [ -z "${pass:-}" ]; then
  pass=$(echo "$plain" | grep -E '^# pass [0-9]+' | tail -1 | grep -oE '[0-9]+')
  fail=$(echo "$plain" | grep -E '^# fail [0-9]+' | tail -1 | grep -oE '[0-9]+')
fi
pass=${pass:-0}; fail=${fail:-0}
total=$((pass + fail))

{
  echo "## 90 percent gate"
  if [ "$total" -eq 0 ]; then
    echo "No test results were found in the output of \`npm test\`. A repository with code must have tests. Gate fails."
  else
    rate=$((pass * 100 / total))
    echo "Passed $pass of $total tests: $rate percent (the floor is 90)."
    if [ "$fail" -gt 0 ]; then
      echo ""
      echo "Failing tests:"
      echo "$plain" | grep -E '(FAIL|✖|×|^not ok) ' | grep -v '^npm ' | sed 's/^/- /' | head -50
    fi
  fi
} >> "$SUMMARY"

[ "$total" -gt 0 ] && [ $((pass * 100)) -ge $((total * 90)) ]
