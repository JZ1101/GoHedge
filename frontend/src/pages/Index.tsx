
import React, { useState } from 'react';
import Header from '../components/Header';
import Dashboard from '../components/Dashboard';

const Index = () => {
  const [activeTab, setActiveTab] = useState('contracts');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="container mx-auto px-4 py-8">
        <Dashboard activeTab={activeTab} />
      </main>
    </div>
  );
};

export default Index;
