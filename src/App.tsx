import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import IncidentForm from './pages/IncidentForm';
import Dashboard from './pages/Dashboard';
import DataTable from './pages/DataTable';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<IncidentForm />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/data" element={<DataTable />} />
        </Routes>
      </Layout>
    </Router>
  );
}
