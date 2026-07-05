# CSSX + Create React App

Create React App does not expose its webpack configuration. This example uses
`react-app-rewired` to add the CSSX webpack adapter without ejecting. It emits
`cssx.css`, linked from `public/index.html`.
