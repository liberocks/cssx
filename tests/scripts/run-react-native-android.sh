#!/usr/bin/env bash
set -euo pipefail

cd "$CSSX_RN_HOST"
pnpm exec react-native start --port 8081 --max-workers 2 > "$RUNNER_TEMP/cssx-metro.log" 2>&1 &
metro_pid=$!
trap 'adb logcat -d > "$RUNNER_TEMP/cssx-android.log" 2>&1; kill "$metro_pid" 2>/dev/null || true' EXIT

pnpm exec react-native run-android --no-packager --active-arch-only
adb shell am force-stop com.cssxnativeharness
adb shell monkey -p com.cssxnativeharness 1

# The first Metro compile can take longer than a fixed startup delay.
for attempt in $(seq 1 60); do
  if adb exec-out uiautomator dump /dev/tty > "$RUNNER_TEMP/cssx-android-ui.xml" 2>/dev/null &&
    grep -Fq 'Vanilla React Native' "$RUNNER_TEMP/cssx-android-ui.xml"; then
    printf 'React Native runtime rendered successfully.\n'
    exit 0
  fi
  sleep 2
done

printf 'Timed out waiting for the React Native screen.\n' >&2
exit 1
