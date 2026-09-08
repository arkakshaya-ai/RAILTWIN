import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/Home';
import { Feature1Page } from './pages/Feature1';
import { Feature2Page } from './pages/Feature2';
import { Feature3Page } from './pages/Feature3';
import { Feature4Page } from './pages/Feature4';
import { Feature5Page } from './pages/Feature5';
import { Feature6Page } from './pages/Feature6';
import { Feature7Page } from './pages/Feature7';
import { Feature8Page } from './pages/Feature8';
import { DocumentationPage } from './pages/Documentation';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/feature/1" element={<Feature1Page />} />
          <Route path="/feature/2" element={<Feature2Page />} />
          <Route path="/feature/3" element={<Feature3Page />} />
          <Route path="/feature/4" element={<Feature4Page />} />
          <Route path="/feature/5" element={<Feature5Page />} />
          <Route path="/feature/6" element={<Feature6Page />} />
          <Route path="/feature/7" element={<Feature7Page />} />
          <Route path="/feature/8" element={<Feature8Page />} />
          <Route path="/documentation" element={<DocumentationPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
