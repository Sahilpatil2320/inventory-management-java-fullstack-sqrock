@REM Minimal Maven Wrapper for Windows: downloads Apache Maven on first use, then runs it.
@REM Usage (PowerShell or cmd):  .\mvnw.cmd spring-boot:run
@echo off
setlocal
set "BASEDIR=%~dp0"
for /f "usebackq tokens=1,* delims==" %%A in ("%BASEDIR%.mvn\wrapper\maven-wrapper.properties") do (
  if "%%A"=="distributionUrl" set "DIST_URL=%%B"
)
for %%F in ("%DIST_URL%") do set "ZIP_NAME=%%~nxF"
set "NAME=%ZIP_NAME:-bin.zip=%"
set "DIST_DIR=%USERPROFILE%\.m2\wrapper\dists\%NAME%"
set "MVN=%DIST_DIR%\%NAME%\bin\mvn.cmd"
if not exist "%MVN%" (
  echo Downloading %DIST_URL%
  if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -UseBasicParsing '%DIST_URL%' -OutFile '%DIST_DIR%\maven.zip'; Expand-Archive -Force '%DIST_DIR%\maven.zip' '%DIST_DIR%'; Remove-Item '%DIST_DIR%\maven.zip'"
  if errorlevel 1 exit /b 1
)
call "%MVN%" %*
exit /b %ERRORLEVEL%
