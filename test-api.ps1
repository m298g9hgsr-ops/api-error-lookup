$body = @{
    errorInput = "TypeError: Cannot read property 'map' of undefined
at App.render (App.jsx:42:15)"
    stackTrace = ""
    context = ""
    language = "javascript"
    framework = "react"
} | ConvertTo-Json -Depth 5

Invoke-WebRequest -Uri "http://localhost:3001/api/analyze" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing -TimeoutSec 60