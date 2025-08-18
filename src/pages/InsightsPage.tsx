import React from 'react';
import { motion } from 'framer-motion';
import { InsightsDashboard } from '@/components/insights';
import Layout from '@/components/Layout';

const InsightsPage: React.FC = () => {
  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="pb-20"
      >
        <InsightsDashboard />
      </motion.div>
    </Layout>
  );
};

export default InsightsPage;