import { BrowserRouter, Routes } from 'react-router-dom';
import CommonRoute from './routes/CommonRoute';
import UserRoute from './routes/UserRoute';
import AdminRoute from './routes/AdminRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {CommonRoute()}
        {UserRoute()}
        {AdminRoute()}
      </Routes>
    </BrowserRouter>
  );
}

export default App;