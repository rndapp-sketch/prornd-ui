import { FrappeProvider } from "frappe-react-sdk";
// import Login from "./pages/Login";
import { Outlet } from "react-router";
// import Login from "./pages/Login";
// import Footer from './components/Footer';

function App() {
  return (
    <div className="App">
		<FrappeProvider
    socketPort="9001"
    siteName="prornd.local">
      
		<Outlet />
		
		</FrappeProvider>

    </div>
  );
}

export default App;
