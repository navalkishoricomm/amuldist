# How to Build the APK

The Android project has been generated in the `android/` folder.

## Prerequisites
- Android Studio installed.
- Android SDK installed.

## Build Steps
1. Open Android Studio.
2. Select **Open an existing Android Studio project**.
3. Navigate to `AmulDistApp/AmulDistAppClient/android` and click **OK**.
4. Wait for Gradle sync to complete.
   - If it complains about missing SDK, go to **File > Project Structure > SDK Location** and set it to your Android SDK path.
5. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
6. Once finished, the APK will be located in:
   `AmulDistAppClient/android/app/build/outputs/apk/debug/app-debug.apk` (or `release` if configured).

## Command Line
If you know your Android SDK path, create a file named `local.properties` in the `android` folder with the following content:
```properties
sdk.dir=C:\\Path\\To\\Your\\Sdk
```
Then run:
```powershell
./gradlew assembleRelease
```
