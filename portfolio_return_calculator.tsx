import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Trash2 } from 'lucide-react';

const PortfolioCalculator = () => {
  const [transactions, setTransactions] = useState([
    { id: 1, date: '2024-01-15', type: '买入', asset: '贵州茅台', shares: 10, price: 1650, currency: 'CNY' },
    { id: 2, date: '2024-03-20', type: '买入', asset: '小米', shares: 1000, price: 18.5, currency: 'HKD' },
    { id: 3, date: '2024-06-10', type: '申购', asset: '现金', shares: 0, price: 50000, currency: 'CNY' }
  ]);
  
  const [rates, setRates] = useState({ CNY: 1, HKD: 0.91, USD: 7.25 });
  const [prices, setPrices] = useState({ '贵州茅台': 1580, '小米': 22.5 });
  const [loading, setLoading] = useState(false);

  // 获取实时汇率
  const fetchRates = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/CNY');
      const data = await response.json();
      setRates({
        CNY: 1,
        HKD: data.rates.HKD || 0.91,
        USD: 1 / (data.rates.USD || 0.138)
      });
    } catch (error) {
      console.error('获取汇率失败:', error);
    }
    setLoading(false);
  };

  // 获取股票价格（模拟实时价格）
  const fetchPrices = async () => {
    setLoading(true);
    try {
      // 这里使用模拟数据，实际可接入真实股票API
      setPrices({
        '贵州茅台': 1580 + Math.random() * 100 - 50,
        '小米': 22.5 + Math.random() * 2 - 1
      });
    } catch (error) {
      console.error('获取价格失败:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRates();
    fetchPrices();
  }, []);

  // 转换为人民币
  const toCNY = (amount, currency) => {
    return amount * rates[currency];
  };

  // 计算基金净值法收益率
  const calculateTimeWeightedReturn = () => {
    const holdings = {};
    let totalInvestment = 0;
    
    transactions.forEach(t => {
      if (t.type === '买入') {
        if (!holdings[t.asset]) holdings[t.asset] = { shares: 0, cost: 0 };
        holdings[t.asset].shares += t.shares;
        holdings[t.asset].cost += toCNY(t.shares * t.price, t.currency);
        totalInvestment += toCNY(t.shares * t.price, t.currency);
      } else if (t.type === '申购') {
        totalInvestment += toCNY(t.price, t.currency);
      } else if (t.type === '赎回') {
        totalInvestment -= toCNY(t.price, t.currency);
      }
    });

    let currentValue = 0;
    Object.keys(holdings).forEach(asset => {
      if (asset !== '现金') {
        const currentPrice = prices[asset] || 0;
        const currency = transactions.find(t => t.asset === asset)?.currency || 'CNY';
        currentValue += toCNY(holdings[asset].shares * currentPrice, currency);
      }
    });

    const cashTransactions = transactions.filter(t => t.type === '申购' || t.type === '赎回');
    cashTransactions.forEach(t => {
      if (t.type === '申购') currentValue += toCNY(t.price, t.currency);
      else if (t.type === '赎回') currentValue -= toCNY(t.price, t.currency);
    });

    return totalInvestment > 0 ? ((currentValue - totalInvestment) / totalInvestment) * 100 : 0;
  };

  // 计算资金加权收益率（简化版IRR）
  const calculateMoneyWeightedReturn = () => {
    const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    let totalCashFlow = 0;
    let weightedReturn = 0;
    const today = new Date();

    sortedTx.forEach(t => {
      const txDate = new Date(t.date);
      const daysHeld = (today - txDate) / (1000 * 60 * 60 * 24);
      const amount = toCNY(t.shares * t.price || t.price, t.currency);
      
      if (t.type === '买入' || t.type === '申购') {
        totalCashFlow += amount;
        weightedReturn += amount * (daysHeld / 365);
      } else if (t.type === '赎回') {
        totalCashFlow -= amount;
        weightedReturn -= amount * (daysHeld / 365);
      }
    });

    const holdings = {};
    transactions.forEach(t => {
      if (t.type === '买入') {
        if (!holdings[t.asset]) holdings[t.asset] = 0;
        holdings[t.asset] += t.shares;
      }
    });

    let currentValue = 0;
    Object.keys(holdings).forEach(asset => {
      if (asset !== '现金') {
        const currentPrice = prices[asset] || 0;
        const currency = transactions.find(t => t.asset === asset)?.currency || 'CNY';
        currentValue += toCNY(holdings[asset] * currentPrice, currency);
      }
    });

    return weightedReturn > 0 ? ((currentValue - totalCashFlow) / weightedReturn) * 100 : 0;
  };

  const addTransaction = () => {
    setTransactions([...transactions, {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      type: '买入',
      asset: '贵州茅台',
      shares: 0,
      price: 0,
      currency: 'CNY'
    }]);
  };

  const deleteTransaction = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const updateTransaction = (id, field, value) => {
    setTransactions(transactions.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  const twrr = calculateTimeWeightedReturn();
  const mwrr = calculateMoneyWeightedReturn();

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">投资组合收益率计算器</h1>
          <button 
            onClick={() => { fetchRates(); fetchPrices(); }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            更新价格
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-gray-600 mb-1">基金净值法收益率</div>
            <div className={`text-2xl font-bold ${twrr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {twrr >= 0 ? '+' : ''}{twrr.toFixed(2)}%
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-gray-600 mb-1">资金加权收益率</div>
            <div className={`text-2xl font-bold ${mwrr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {mwrr >= 0 ? '+' : ''}{mwrr.toFixed(2)}%
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="text-sm text-gray-600 mb-1">实时汇率</div>
            <div className="text-xs space-y-1">
              <div>USD/CNY: {rates.USD.toFixed(4)}</div>
              <div>HKD/CNY: {rates.HKD.toFixed(4)}</div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">当前股票价格</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded">
              <span className="font-medium">贵州茅台:</span> ¥{prices['贵州茅台'].toFixed(2)}
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <span className="font-medium">小米:</span> HK${prices['小米'].toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">交易记录</h2>
          <button 
            onClick={addTransaction}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Plus className="w-4 h-4" />
            添加交易
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">资产</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">数量</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">价格</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">币种</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input 
                      type="date" 
                      value={t.date}
                      onChange={(e) => updateTransaction(t.id, 'date', e.target.value)}
                      className="border rounded px-2 py-1 w-full"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select 
                      value={t.type}
                      onChange={(e) => updateTransaction(t.id, 'type', e.target.value)}
                      className="border rounded px-2 py-1 w-full"
                    >
                      <option>买入</option>
                      <option>卖出</option>
                      <option>申购</option>
                      <option>赎回</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select 
                      value={t.asset}
                      onChange={(e) => updateTransaction(t.id, 'asset', e.target.value)}
                      className="border rounded px-2 py-1 w-full"
                    >
                      <option>贵州茅台</option>
                      <option>小米</option>
                      <option>现金</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="number" 
                      value={t.shares}
                      onChange={(e) => updateTransaction(t.id, 'shares', parseFloat(e.target.value) || 0)}
                      className="border rounded px-2 py-1 w-20"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="number" 
                      value={t.price}
                      onChange={(e) => updateTransaction(t.id, 'price', parseFloat(e.target.value) || 0)}
                      className="border rounded px-2 py-1 w-24"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select 
                      value={t.currency}
                      onChange={(e) => updateTransaction(t.id, 'currency', e.target.value)}
                      className="border rounded px-2 py-1 w-full"
                    >
                      <option>CNY</option>
                      <option>HKD</option>
                      <option>USD</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => deleteTransaction(t.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2 text-gray-800">计算说明</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li><strong>基金净值法收益率 (TWR):</strong> 衡量投资经理的表现，排除现金流时间影响</li>
            <li><strong>资金加权收益率 (MWR):</strong> 考虑现金流时间的实际收益率，更接近投资者真实回报</li>
            <li>所有金额自动转换为人民币计算</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PortfolioCalculator;