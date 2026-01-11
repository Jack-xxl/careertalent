export default function RootLayout({children}:{children:React.ReactNode}){
  return (
    <html>
      <head>
        <meta charSet="utf-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <title>TalentAI</title>
      </head>
      <body style={{fontFamily:'system-ui, -apple-system, Segoe UI, Roboto', maxWidth:900, margin:'40px auto', padding:'0 16px'}}>
        {children}
      </body>
    </html>
  );
}
