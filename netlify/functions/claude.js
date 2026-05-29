{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 exports.handler = async function (event) \{\
  if (event.httpMethod !== "POST") \{\
    return \{ statusCode: 405, body: "Method Not Allowed" \};\
  \}\
\
  try \{\
    const \{ messages, system, max_tokens \} = JSON.parse(event.body);\
\
    const response = await fetch("https://api.anthropic.com/v1/messages", \{\
      method: "POST",\
      headers: \{\
        "Content-Type": "application/json",\
        "x-api-key": process.env.ANTHROPIC_API_KEY,\
        "anthropic-version": "2023-06-01",\
      \},\
      body: JSON.stringify(\{\
        model: "claude-sonnet-4-20250514",\
        max_tokens: max_tokens || 1000,\
        system,\
        messages,\
      \}),\
    \});\
\
    const data = await response.json();\
\
    return \{\
      statusCode: 200,\
      headers: \{ "Content-Type": "application/json" \},\
      body: JSON.stringify(data),\
    \};\
  \} catch (err) \{\
    return \{\
      statusCode: 500,\
      body: JSON.stringify(\{ error: err.message \}),\
    \};\
  \}\
\};}