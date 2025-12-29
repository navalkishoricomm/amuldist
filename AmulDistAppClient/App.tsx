import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, Pressable, FlatList, Modal, ScrollView, Animated, Easing, Image, BackHandler, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Role = 'distributor' | 'retailer';
type User = {
  _id: string;
  name: string;
  email: string;
  role: Role | 'admin';
  active: boolean;
  profileEditedOnce?: boolean;
  phone?: string;
  address?: string;
  currentBalance?: number;
  distributorId?: string;
};

type Product = {
  _id: string;
  nameEnglish: string;
  nameHindi: string;
  active: boolean;
  unit?: string;
};

type Unit = {
  _id: string;
  type: 'Simple' | 'Compound';
  symbol: string;
  formalName?: string;
  decimalPlaces?: number;
  firstUnit?: string;
  secondUnit?: string;
  conversionFactor?: number;
};

type Rate = {
  _id: string;
  productId: string;
  distributorId: string;
  price: number;
};

export default function App() {
  const [baseUrl, setBaseUrl] = useState('http://[2602:ff16:13:104e::1]:4000');
  const [showSettings, setShowSettings] = useState(false);

  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [mode, setMode] = useState<'login' | 'signup' | 'admin' | 'user'>('login');
  const [adminTab, setAdminTab] = useState<'users' | 'stats' | 'products' | 'units'>('users');
  const [distTab, setDistTab] = useState<'retailers' | 'products' | 'units' | 'rates' | 'profile' | 'reports'>('retailers');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState<Role>('distributor');

  const [adminNewName, setAdminNewName] = useState('');
  const [adminNewEmail, setAdminNewEmail] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminNewRole, setAdminNewRole] = useState<Role>('distributor');

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<'all' | Role>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [stats, setStats] = useState<{ total: number; distributors: number; retailers: number; admins: number; active: number; inactive: number; recent: User[] } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productName, setProductName] = useState('');
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitFilterType, setUnitFilterType] = useState<'all' | 'Simple' | 'Compound'>('all');
  const [unitSymbolQuery, setUnitSymbolQuery] = useState('');
  const [editProductUnits, setEditProductUnits] = useState<Product | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');

  const [retailers, setRetailers] = useState<User[]>([]);
  const [retName, setRetName] = useState('');
  const [retPhone, setRetPhone] = useState('');
  const [retAddress, setRetAddress] = useState('');
  const [retBalance, setRetBalance] = useState('');

  const [rates, setRates] = useState<Rate[]>([]);
  const [rateMap, setRateMap] = useState<Record<string, string>>({});

  const [newUnitType, setNewUnitType] = useState<'Simple' | 'Compound'>('Simple');
  const [newUnitSymbol, setNewUnitSymbol] = useState('');
  const [newUnitFormalName, setNewUnitFormalName] = useState('');
  const [newUnitDecimals, setNewUnitDecimals] = useState('0');

  const [transactions, setTransactions] = useState<any[]>([]);
  const [txFilterType, setTxFilterType] = useState<string>('');
  const [txFilterDateFrom, setTxFilterDateFrom] = useState('');
  const [txFilterDateTo, setTxFilterDateTo] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  const bannerAnim = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bannerAnim, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(bannerAnim, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    ).start();
  }, [bannerAnim]);
  const bannerBg = bannerAnim.interpolate({ inputRange: [0, 1], outputRange: ['#f0f5ff', '#ffe4e6'] });

  const listUrl = useMemo(() => `${baseUrl}/api/users`, [baseUrl]);

  useEffect(() => {
    AsyncStorage.getItem('token').then(t => {
      if (t) {
        setToken(t);
        // Verify token
        fetch(`${baseUrl}/api/me`, { headers: { Authorization: `Bearer ${t}` } })
          .then(res => {
            if (res.ok) return res.json();
            throw new Error('Invalid token');
          })
          .then(user => {
            setCurrentUser(user);
            setMode(user.role === 'admin' ? 'admin' : 'user');
          })
          .catch(() => {
            setToken(null);
            AsyncStorage.removeItem('token');
            setMode('login');
          })
          .finally(() => setInitialLoading(false));
      } else {
        setInitialLoading(false);
      }
    });
  }, [baseUrl]);

  useEffect(() => {
    const backAction = () => {
      if (editUser) { setEditUser(null); return true; }
      if (editProductUnits) { setEditProductUnits(null); setSelectedUnitId(''); return true; }
      if (showSettings) { setShowSettings(false); return true; }
      if (mode === 'signup') { setMode('login'); return true; }

      if (mode === 'login') return false;
      
      Alert.alert('Hold on!', 'Are you sure you want to exit?', [
        { text: 'Cancel', onPress: () => null, style: 'cancel' },
        { text: 'YES', onPress: () => BackHandler.exitApp() }
      ]);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [mode, editUser, editProductUnits, showSettings]);

  async function login() {
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim().toLowerCase(), password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to login');
      setToken(data.token);
      AsyncStorage.setItem('token', data.token);
      setCurrentUser(data.user);
      setMode(data.user.role === 'admin' ? 'admin' : 'user');
      setLoginEmail('');
      setLoginPassword('');
    } catch (e: any) {
      setError(e.message || 'Failed to login');
    }
  }

  async function signup() {
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: signupName.trim(), email: signupEmail.trim().toLowerCase(), password: signupPassword, role: signupRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to signup');
      setToken(data.token);
      AsyncStorage.setItem('token', data.token);
      setCurrentUser(data.user);
      setMode('user');
      setSignupName('');
      setSignupEmail('');
      setSignupPassword('');
    } catch (e: any) {
      setError(e.message || 'Failed to signup');
    }
  }

  async function loadUsers() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterRole !== 'all') params.set('role', filterRole);
      if (filterActive === 'active') params.set('active', 'true');
      if (filterActive === 'inactive') params.set('active', 'false');
      const res = await fetch(`${listUrl}?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      setUsers(data as User[]);
    } catch (e) {
      setError((e as any).message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mode === 'admin' && adminTab === 'users') loadUsers();
  }, [mode, token, filterRole, filterActive, adminTab]);

  async function loadStats() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load stats');
      setStats(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mode === 'admin' && adminTab === 'stats') loadStats();
  }, [mode, token, adminTab]);

  useEffect(() => {
    if (mode === 'admin' && adminTab === 'products' && units.length === 0) {
      loadUnits();
    }
  }, [mode, adminTab]);

  async function loadProducts() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/products`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load products');
      setProducts(data as Product[]);
    } catch (e: any) {
      setError(e.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mode === 'admin' && adminTab === 'products') loadProducts();
  }, [mode, token, adminTab]);

  async function createProduct() {
    if (!token) return;
    setError(null);
    try {
      const nameEnglish = productName.trim();
      if (!nameEnglish) throw new Error('Name is required');
      const res = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nameEnglish }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create product');
      setProductName('');
      await loadProducts();
    } catch (e: any) {
      setError(e.message || 'Failed to create product');
    }
  }

  async function loadUnits() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (unitFilterType !== 'all') params.set('type', unitFilterType);
      if (unitSymbolQuery.trim()) params.set('symbol', unitSymbolQuery.trim());
      const res = await fetch(`${baseUrl}/api/units?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      const ctype = res.headers.get('content-type') || '';
      const body = await res.text();
      const isJson = ctype.includes('application/json');
      const data = isJson ? (() => { try { return JSON.parse(body); } catch { return null; } })() : null;
      if (!res.ok) throw new Error((data && (data as any).error) || `Units fetch failed (HTTP ${res.status})`);
      if (!isJson || !data) throw new Error('Units endpoint returned non-JSON response');
      setUnits(data as Unit[]);
    } catch (e: any) {
      setError(e.message || 'Failed to load units');
    } finally {
      setLoading(false);
    }
  }

  async function createUnit() {
    if (!token) return;
    setError(null);
    try {
      const symbol = newUnitSymbol.trim();
      if (!symbol) throw new Error('Unit symbol required');
      const formalName = newUnitFormalName.trim();
      const decimalPlaces = Number(newUnitDecimals) || 0;
      const res = await fetch(`${baseUrl}/api/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: newUnitType, symbol, formalName, decimalPlaces }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create unit');
      setNewUnitSymbol('');
      setNewUnitFormalName('');
      setNewUnitDecimals('0');
      await loadUnits();
    } catch (e: any) {
      setError(e.message || 'Failed to create unit');
    }
  }

  useEffect(() => {
    if ((mode === 'admin' && adminTab === 'units') || (mode === 'user' && currentUser?.role === 'distributor' && distTab === 'units')) loadUnits();
  }, [mode, token, adminTab, unitFilterType, distTab, currentUser]);

  function toggleUnitSelection(id: string) {
    setSelectedUnitId((prev) => (prev === id ? '' : id));
  }

  async function saveUnitsForProduct() {
    if (!token || !editProductUnits) return;
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/products/${editProductUnits._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ unit: selectedUnitId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save units');
      setEditProductUnits(null);
      setSelectedUnitId('');
      await loadProducts();
    } catch (e: any) {
      setError(e.message || 'Failed to save units');
    }
  }

  async function loadMyRetailers() {
    if (!token || !currentUser || currentUser.role !== 'distributor') return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/my/retailers`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load retailers');
      setRetailers(data as User[]);
    } catch (e: any) {
      setError(e.message || 'Failed to load retailers');
    } finally {
      setLoading(false);
    }
  }

  async function createMyRetailer() {
    if (!token || !currentUser || currentUser.role !== 'distributor') return;
    setError(null);
    try {
      const name = retName.trim();
      if (!name) throw new Error('Retailer name required');
      const phone = retPhone.trim();
      const address = retAddress.trim();
      const currentBalance = Number(retBalance) || 0;
      const res = await fetch(`${baseUrl}/api/my/retailers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, phone, address, currentBalance }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create retailer');
      setRetName('');
      setRetPhone('');
      setRetAddress('');
      setRetBalance('');
      await loadMyRetailers();
    } catch (e: any) {
      setError(e.message || 'Failed to create retailer');
    }
  }

  async function toggleRetailerActive(r: User) {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/my/retailers/${r._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: !r.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      await loadMyRetailers();
    } catch (e: any) {
      setError(e.message || 'Failed to update status');
    }
  }

  async function deleteMyRetailer(r: User) {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/my/retailers/${r._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete retailer');
      await loadMyRetailers();
    } catch (e: any) {
      setError(e.message || 'Failed to delete retailer');
    }
  }

  async function loadRates() {
    if (!token || !currentUser || currentUser.role !== 'distributor') return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/my/rates`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load rates');
      setRates(data as Rate[]);
      const m: Record<string, string> = {};
      (data as Rate[]).forEach((r) => { m[r.productId] = String(r.price); });
      setRateMap(m);
    } catch (e: any) {
      setError(e.message || 'Failed to load rates');
    } finally {
      setLoading(false);
    }
  }

  async function setRate(productId: string) {
    if (!token) return;
    setError(null);
    try {
      const priceStr = rateMap[productId] || '';
      const price = Number(priceStr);
      if (!Number.isFinite(price)) throw new Error('Enter valid price');
      const res = await fetch(`${baseUrl}/api/my/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId, price }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set rate');
      await loadRates();
    } catch (e: any) {
      setError(e.message || 'Failed to set rate');
    }
  }

  async function loadRetailerTransactions() {
    if (!token || !currentUser || currentUser.role !== 'retailer') return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (txFilterType) params.append('type', txFilterType);
      if (txFilterDateFrom) params.append('from', txFilterDateFrom);
      if (txFilterDateTo) params.append('to', txFilterDateTo);

      const res = await fetch(`${baseUrl}/api/retailer/transactions?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load transactions');
      setTransactions(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (currentUser?.role === 'retailer' && distTab === 'reports') loadRetailerTransactions();
  }, [currentUser, distTab]);

  async function adminCreateUser() {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: adminNewName.trim(), email: adminNewEmail.trim().toLowerCase(), role: adminNewRole, password: adminNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      setAdminNewName('');
      setAdminNewEmail('');
      setAdminNewPassword('');
      await loadUsers();
    } catch (e: any) {
      setError(e.message || 'Failed to create');
    }
  }

  async function adminToggleActive(u: User) {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/users/${u._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: !u.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      await loadUsers();
    } catch (e: any) {
      setError(e.message || 'Failed to update');
    }
  }

  async function adminDeleteUser(u: User) {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/users/${u._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      await loadUsers();
    } catch (e: any) {
      setError(e.message || 'Failed to delete');
    }
  }

  async function adminSaveEdit() {
    if (!token || !editUser) return;
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/admin/users/${editUser._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editUser.name,
          phone: editUser.phone,
          address: editUser.address,
          role: editUser.role,
          active: editUser.active,
          distributorId: editUser.distributorId
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      setEditUser(null);
      await loadUsers();
    } catch (e: any) {
      setError(e.message || 'Failed to update');
    }
  }

  async function refreshMe() {
    if (!token) return;
    const res = await fetch(`${baseUrl}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) setCurrentUser(data as User);
  }

  async function updateMyProfile(next: Partial<User>) {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/me/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: next.name, phone: next.phone, address: next.address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      setCurrentUser(data as User);
    } catch (e: any) {
      setError(e.message || 'Failed to update profile');
    }
  }

  function logout() {
    setToken(null);
    setCurrentUser(null);
    setMode('login');
  }

  if (initialLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text>Loading...</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (mode === 'login') {
    return (
      <ScrollView contentContainerStyle={[styles.container, styles.centerContent]} style={{flex: 1, backgroundColor: '#f0f5ff'}}>
        <Text style={styles.title}>Amul Distributor</Text>
        <View style={styles.card}>
          <Text style={[styles.title, { fontSize: 24, marginBottom: 16 }]}>Login</Text>
          <View style={styles.formCol}>
            <Text style={styles.label}>Email</Text>
            <TextInput placeholder="Enter email" value={loginEmail} onChangeText={setLoginEmail} autoCapitalize="none" style={styles.input} placeholderTextColor="#94a3b8" />
            <Text style={styles.label}>Password</Text>
            <TextInput placeholder="Enter password" value={loginPassword} onChangeText={setLoginPassword} secureTextEntry style={styles.input} placeholderTextColor="#94a3b8" />
            <Pressable onPress={login} style={styles.primaryBtn}><Text style={styles.primaryText}>Login</Text></Pressable>
            <Pressable onPress={() => setMode('signup')} style={styles.linkBtn}><Text style={styles.linkText}>Create an account</Text></Pressable>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <Pressable onPress={() => setShowSettings(!showSettings)} style={{ marginTop: 20, alignSelf: 'center' }}>
          <Text style={{ color: '#64748b' }}>Server Settings</Text>
        </Pressable>

        {showSettings && (
          <View style={[styles.card, { marginTop: 10 }]}>
            <Text style={styles.label}>Server URL</Text>
            <TextInput value={baseUrl} onChangeText={setBaseUrl} style={styles.input} autoCapitalize="none" />
          </View>
        )}
        <StatusBar style="auto" />
      </ScrollView>
    );
  }

  if (mode === 'signup') {
    return (
      <ScrollView contentContainerStyle={[styles.container, styles.centerContent]} style={{flex: 1, backgroundColor: '#f0f5ff'}}>
        <Text style={styles.title}>Sign Up</Text>
        <View style={styles.card}>
          <View style={styles.formCol}>
            <TextInput placeholder="Full Name" value={signupName} onChangeText={setSignupName} style={styles.input} placeholderTextColor="#94a3b8" />
            <TextInput placeholder="Email" value={signupEmail} onChangeText={setSignupEmail} autoCapitalize="none" style={styles.input} placeholderTextColor="#94a3b8" />
            <TextInput placeholder="Password" value={signupPassword} onChangeText={setSignupPassword} secureTextEntry style={styles.input} placeholderTextColor="#94a3b8" />
            <Text style={{ marginBottom: 4, fontWeight: '600', color: '#333' }}>I am a:</Text>
            <View style={styles.roleRow}>
              <Pressable onPress={() => setSignupRole('distributor')} style={[styles.roleBtn, signupRole === 'distributor' && styles.roleBtnActive]}>
                <Text style={styles.roleText}>Distributor</Text>
              </Pressable>
              <Pressable onPress={() => setSignupRole('retailer')} style={[styles.roleBtn, signupRole === 'retailer' && styles.roleBtnActive]}>
                <Text style={styles.roleText}>Retailer</Text>
              </Pressable>
            </View>
            <Pressable onPress={signup} style={styles.primaryBtn}><Text style={styles.primaryText}>Sign Up</Text></Pressable>
            <Pressable onPress={() => setMode('login')} style={styles.linkBtn}><Text style={styles.linkText}>Already have an account?</Text></Pressable>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </View>
        <StatusBar style="auto" />
      </ScrollView>
    );
  }

  if (mode === 'admin') {
    return (
      <View style={styles.container}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={styles.title}>Admin Panel</Text>
          <Pressable onPress={logout} style={styles.secondaryBtn}><Text style={styles.secondaryText}>Logout</Text></Pressable>
        </View>

        <ScrollView horizontal style={styles.tabScroll} showsHorizontalScrollIndicator={false}>
          <Pressable onPress={() => setAdminTab('users')} style={[styles.tabBtn, adminTab === 'users' && styles.tabBtnActive]}>
            <Text style={styles.tabText}>Users</Text>
          </Pressable>
          <Pressable onPress={() => setAdminTab('stats')} style={[styles.tabBtn, adminTab === 'stats' && styles.tabBtnActive]}>
            <Text style={styles.tabText}>Stats</Text>
          </Pressable>
          <Pressable onPress={() => setAdminTab('products')} style={[styles.tabBtn, adminTab === 'products' && styles.tabBtnActive]}>
            <Text style={styles.tabText}>Products</Text>
          </Pressable>
          <Pressable onPress={() => setAdminTab('units')} style={[styles.tabBtn, adminTab === 'units' && styles.tabBtnActive]}>
            <Text style={styles.tabText}>Units</Text>
          </Pressable>
        </ScrollView>

        {adminTab === 'users' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Create New User</Text>
              <View style={styles.formCol}>
                <TextInput placeholder="Name" value={adminNewName} onChangeText={setAdminNewName} style={styles.input} />
                <TextInput placeholder="Email" value={adminNewEmail} onChangeText={setAdminNewEmail} autoCapitalize="none" style={styles.input} />
                <TextInput placeholder="Password" value={adminNewPassword} onChangeText={setAdminNewPassword} style={styles.input} />
                <View style={styles.roleRow}>
                  <Pressable onPress={() => setAdminNewRole('distributor')} style={[styles.roleBtn, adminNewRole === 'distributor' && styles.roleBtnActive]}>
                    <Text style={styles.roleText}>Distributor</Text>
                  </Pressable>
                  <Pressable onPress={() => setAdminNewRole('retailer')} style={[styles.roleBtn, adminNewRole === 'retailer' && styles.roleBtnActive]}>
                    <Text style={styles.roleText}>Retailer</Text>
                  </Pressable>
                </View>
                <Pressable onPress={adminCreateUser} style={styles.createBtn}><Text style={styles.createText}>Create User</Text></Pressable>
              </View>
            </View>

            <View style={{ marginVertical: 12 }}>
              <Text style={{ fontWeight: '600', marginBottom: 8 }}>Filter Users:</Text>
              <View style={styles.roleRow}>
                <Pressable onPress={() => setFilterRole('all')} style={[styles.roleBtn, filterRole === 'all' && styles.roleBtnActive]}>
                  <Text style={styles.roleText}>All</Text>
                </Pressable>
                <Pressable onPress={() => setFilterRole('distributor')} style={[styles.roleBtn, filterRole === 'distributor' && styles.roleBtnActive]}>
                  <Text style={styles.roleText}>Distributor</Text>
                </Pressable>
                <Pressable onPress={() => setFilterRole('retailer')} style={[styles.roleBtn, filterRole === 'retailer' && styles.roleBtnActive]}>
                  <Text style={styles.roleText}>Retailer</Text>
                </Pressable>
              </View>
              <View style={styles.roleRow}>
                <Pressable onPress={() => setFilterActive('all')} style={[styles.roleBtn, filterActive === 'all' && styles.roleBtnActive]}>
                  <Text style={styles.roleText}>All</Text>
                </Pressable>
                <Pressable onPress={() => setFilterActive('active')} style={[styles.roleBtn, filterActive === 'active' && styles.roleBtnActive]}>
                  <Text style={styles.roleText}>Active</Text>
                </Pressable>
                <Pressable onPress={() => setFilterActive('inactive')} style={[styles.roleBtn, filterActive === 'inactive' && styles.roleBtnActive]}>
                  <Text style={styles.roleText}>Inactive</Text>
                </Pressable>
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {loading ? <Text>Loading...</Text> : null}

            <FlatList
              data={users}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={styles.empty}>No users yet</Text>}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardSubtitle}>{item.email}</Text>
                    <Text style={styles.badge}>{item.role}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable onPress={() => setEditUser(item)} style={styles.secondaryBtn}><Text style={styles.secondaryText}>Edit</Text></Pressable>
                    <Pressable onPress={() => adminToggleActive(item)} style={[styles.toggleBtn, item.active ? styles.activeOn : styles.activeOff]}>
                      <Text style={styles.toggleText}>{item.active ? 'Active' : 'Inactive'}</Text>
                    </Pressable>
                    <Pressable onPress={() => adminDeleteUser(item)} style={styles.dangerBtn}><Text style={styles.dangerText}>Delete</Text></Pressable>
                  </View>
                </View>
              )}
            />
            {editUser && (
              <View style={styles.modal}>
                <View style={styles.modalCard}>
                  <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Edit User</Text>
                  <TextInput placeholder="Name" value={editUser.name} onChangeText={(t) => setEditUser({ ...editUser, name: t })} style={styles.input} />
                  <TextInput placeholder="Phone" value={editUser.phone || ''} onChangeText={(t) => setEditUser({ ...editUser, phone: t })} style={styles.input} />
                  <TextInput placeholder="Address" value={editUser.address || ''} onChangeText={(t) => setEditUser({ ...editUser, address: t })} style={styles.input} />
                  {editUser.role === 'retailer' && (
                    <TextInput placeholder="Distributor ID" value={editUser.distributorId || ''} onChangeText={(t) => setEditUser({ ...editUser, distributorId: t })} style={styles.input} />
                  )}
                  <View style={styles.roleRow}>
                    <Pressable onPress={() => setEditUser({ ...editUser, role: 'distributor' })} style={[styles.roleBtn, editUser.role === 'distributor' && styles.roleBtnActive]}>
                      <Text style={styles.roleText}>Distributor</Text>
                    </Pressable>
                    <Pressable onPress={() => setEditUser({ ...editUser, role: 'retailer' })} style={[styles.roleBtn, editUser.role === 'retailer' && styles.roleBtnActive]}>
                      <Text style={styles.roleText}>Retailer</Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <Pressable onPress={adminSaveEdit} style={styles.primaryBtn}><Text style={styles.primaryText}>Save</Text></Pressable>
                    <Pressable onPress={() => setEditUser(null)} style={styles.secondaryBtn}><Text style={styles.secondaryText}>Cancel</Text></Pressable>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {adminTab === 'stats' && (
          <View>
            {loading ? <Text>Loading...</Text> : null}
            {stats && (
              <View style={styles.statsCard}>
                <Text style={styles.statLine}>Total: {stats.total}</Text>
                <Text style={styles.statLine}>Admins: {stats.admins}</Text>
                <Text style={styles.statLine}>Distributors: {stats.distributors}</Text>
                <Text style={styles.statLine}>Retailers: {stats.retailers}</Text>
                <Text style={styles.statLine}>Active: {stats.active} | Inactive: {stats.inactive}</Text>
                <Text style={[styles.statLine, { marginTop: 8 }]}>Recent:</Text>
                {stats.recent.map((u) => (
                  <Text key={u._id} style={styles.statItem}>{u.name} • {u.email} • {u.role}</Text>
                ))}
                <View style={styles.chartBox}>
                  {(() => {
                    const maxVal = Math.max(stats.total, stats.admins, stats.distributors, stats.retailers, (stats as any).products || 0);
                    const rows = [
                      { label: 'Total', value: stats.total, color: '#7c3aed' },
                      { label: 'Admins', value: stats.admins, color: '#ef4444' },
                      { label: 'Distributors', value: stats.distributors, color: '#16a34a' },
                      { label: 'Retailers', value: stats.retailers, color: '#f59e0b' },
                      { label: 'Products', value: (stats as any).products || 0, color: '#0ea5e9' },
                    ];
                    return rows.map((r) => (
                      <View key={r.label} style={styles.chartRow}>
                        <Text style={styles.chartLabel}>{r.label}</Text>
                        <View style={[styles.chartBar, { width: `${maxVal ? Math.round((r.value / maxVal) * 100) : 0}%`, backgroundColor: r.color }]} />
                        <Text style={styles.chartValue}>{r.value}</Text>
                      </View>
                    ));
                  })()}
                </View>
              </View>
            )}
          </View>
        )}

        {adminTab === 'products' && (
          <View>
            <View style={styles.formRow}>
              <TextInput placeholder="Product name (English)" value={productName} onChangeText={setProductName} style={styles.input} />
              <Pressable onPress={createProduct} style={styles.createBtn}><Text style={styles.createText}>Create</Text></Pressable>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {loading ? <Text>Loading...</Text> : null}
            <FlatList
              data={products}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={styles.empty}>No products yet</Text>}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.nameEnglish}</Text>
                    <Text style={styles.cardSubtitle}>{item.nameHindi}</Text>
                    <Text style={styles.cardSubtitle}>
                      {(() => {
                        const u = item.unit;
                        if (!u) return 'Unit: none';
                        if (typeof u === 'object') return `Unit: ${u.symbol}`;
                        const found = units.find((x) => x._id === u);
                        return `Unit: ${found ? found.symbol : u}`;
                      })()}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={styles.badge}>{item.active ? 'active' : 'inactive'}</Text>
                    <Pressable
                      onPress={async () => {
                        setEditProductUnits(item);
                        const uId = typeof item.unit === 'object' ? item.unit._id : item.unit;
                        setSelectedUnitId(uId || '');
                        if (units.length === 0) await loadUnits();
                      }}
                      style={styles.secondaryBtn}
                    >
                      <Text style={styles.secondaryText}>Map Unit</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            />
            {Platform.OS === 'web' ? (
              editProductUnits && (
                <View style={styles.modal}>
                  <View style={styles.modalCard}>
                    <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Select Unit</Text>
                    <View style={{ maxHeight: 300 }}>
                      <FlatList
                        data={units}
                        keyExtractor={(u) => u._id}
                        renderItem={({ item: u }) => (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                            <Pressable
                              onPress={() => toggleUnitSelection(u._id)}
                              style={[styles.roleBtn, selectedUnitId === u._id && styles.roleBtnActive]}
                            >
                              <Text style={styles.roleText}>{selectedUnitId === u._id ? '✓' : ''}</Text>
                            </Pressable>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.cardTitle}>{u.symbol}</Text>
                              <Text style={styles.cardSubtitle}>{u.formalName || ''}</Text>
                              <Text style={styles.cardSubtitle}>Type: {u.type} • Decimals: {u.decimalPlaces ?? 0}</Text>
                              {u.type === 'Compound' && (
                                <Text style={styles.cardSubtitle}>
                                  {(units.find((x) => x._id === (u.firstUnit || ''))?.symbol || u.firstUnit || '')}
                                  {' → '}
                                  {(units.find((x) => x._id === (u.secondUnit || ''))?.symbol || u.secondUnit || '')}
                                  {' × '}
                                  {u.conversionFactor ?? ''}
                                </Text>
                              )}
                            </View>
                            <Text style={styles.badge}>{u.type}</Text>
                          </View>
                        )}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <Pressable onPress={saveUnitsForProduct} style={styles.primaryBtn}><Text style={styles.primaryText}>Save</Text></Pressable>
                      <Pressable onPress={() => { setEditProductUnits(null); setSelectedUnitId(''); }} style={styles.secondaryBtn}><Text style={styles.secondaryText}>Cancel</Text></Pressable>
                    </View>
                  </View>
                </View>
              )
            ) : (
              <Modal visible={!!editProductUnits} transparent animationType="fade" onRequestClose={() => { setEditProductUnits(null); setSelectedUnitId(''); }}>
                <View style={styles.modal}>
                  <View style={styles.modalCard}>
                    <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Select Unit</Text>
                    <View style={{ maxHeight: 300 }}>
                      <FlatList
                        data={units}
                        keyExtractor={(u) => u._id}
                        renderItem={({ item: u }) => (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                            <Pressable
                              onPress={() => toggleUnitSelection(u._id)}
                              style={[styles.roleBtn, selectedUnitId === u._id && styles.roleBtnActive]}
                            >
                              <Text style={styles.roleText}>{selectedUnitId === u._id ? '✓' : ''}</Text>
                            </Pressable>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.cardTitle}>{u.symbol}</Text>
                              <Text style={styles.cardSubtitle}>{u.formalName || ''}</Text>
                              <Text style={styles.cardSubtitle}>Type: {u.type} • Decimals: {u.decimalPlaces ?? 0}</Text>
                              {u.type === 'Compound' && (
                                <Text style={styles.cardSubtitle}>
                                  {(units.find((x) => x._id === (u.firstUnit || ''))?.symbol || u.firstUnit || '')}
                                  {' → '}
                                  {(units.find((x) => x._id === (u.secondUnit || ''))?.symbol || u.secondUnit || '')}
                                  {' × '}
                                  {u.conversionFactor ?? ''}
                                </Text>
                              )}
                            </View>
                            <Text style={styles.badge}>{u.type}</Text>
                          </View>
                        )}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <Pressable onPress={saveUnitsForProduct} style={styles.primaryBtn}><Text style={styles.primaryText}>Save</Text></Pressable>
                      <Pressable onPress={() => { setEditProductUnits(null); setSelectedUnitId(''); }} style={styles.secondaryBtn}><Text style={styles.secondaryText}>Cancel</Text></Pressable>
                    </View>
                  </View>
                </View>
              </Modal>
            )}
          </View>
        )}

        {adminTab === 'units' && (
          <View>
            <View style={styles.formRow}>
              <View style={styles.roleRow}>
                <Pressable onPress={() => setUnitFilterType('all')} style={[styles.roleBtn, unitFilterType === 'all' && styles.roleBtnActive]}>
                  <Text style={styles.roleText}>All</Text>
                </Pressable>
                <Pressable onPress={() => setUnitFilterType('Simple')} style={[styles.roleBtn, unitFilterType === 'Simple' && styles.roleBtnActive]}>
                  <Text style={styles.roleText}>Simple</Text>
                </Pressable>
                <Pressable onPress={() => setUnitFilterType('Compound')} style={[styles.roleBtn, unitFilterType === 'Compound' && styles.roleBtnActive]}>
                  <Text style={styles.roleText}>Compound</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.formRow}>
              <TextInput placeholder="Search symbol" value={unitSymbolQuery} onChangeText={setUnitSymbolQuery} style={styles.input} />
              <Pressable onPress={loadUnits} style={styles.secondaryBtn}><Text style={styles.secondaryText}>Search</Text></Pressable>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {loading ? <Text>Loading...</Text> : null}
            <FlatList
              data={units}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={styles.empty}>No units</Text>}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.symbol}</Text>
                    <Text style={styles.cardSubtitle}>{item.formalName || ''}</Text>
                    <Text style={styles.cardSubtitle}>Type: {item.type} • Decimals: {item.decimalPlaces ?? 0}</Text>
                    {item.type === 'Compound' && (
                      <Text style={styles.cardSubtitle}>
                        {(units.find((x) => x._id === (item.firstUnit || ''))?.symbol || item.firstUnit || '')}
                        {' → '}
                        {(units.find((x) => x._id === (item.secondUnit || ''))?.symbol || item.secondUnit || '')}
                        {' × '}
                        {item.conversionFactor ?? ''}
                      </Text>
                    )}
                  </View>
                  <View style={{ gap: 6 }}>
                    <Text style={styles.badge}>{item.type}</Text>
                    {item.type === 'Compound' && (
                      <Text style={styles.statItem}>x {item.conversionFactor}</Text>
                    )}
                  </View>
                </View>
              )}
            />
          </View>
        )}

        <StatusBar style="auto" />
      </View>
    );
  }

  // User/Distributor Mode
  if (mode === 'user') {
    return (
      <View style={styles.container}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={styles.title}>Welcome, {currentUser?.name}</Text>
          <Pressable onPress={logout} style={styles.secondaryBtn}><Text style={styles.secondaryText}>Logout</Text></Pressable>
        </View>

        {currentUser?.role === 'distributor' && (
          <ScrollView horizontal style={styles.tabScroll} showsHorizontalScrollIndicator={false}>
            <Pressable onPress={() => setDistTab('retailers')} style={[styles.tabBtn, distTab === 'retailers' && styles.tabBtnActive]}>
              <Text style={styles.tabText}>Retailers</Text>
            </Pressable>
            <Pressable onPress={() => setDistTab('products')} style={[styles.tabBtn, distTab === 'products' && styles.tabBtnActive]}>
              <Text style={styles.tabText}>Products</Text>
            </Pressable>
            <Pressable onPress={() => setDistTab('units')} style={[styles.tabBtn, distTab === 'units' && styles.tabBtnActive]}>
              <Text style={styles.tabText}>Units</Text>
            </Pressable>
            <Pressable onPress={() => setDistTab('rates')} style={[styles.tabBtn, distTab === 'rates' && styles.tabBtnActive]}>
              <Text style={styles.tabText}>Rates</Text>
            </Pressable>
            <Pressable onPress={() => setDistTab('profile')} style={[styles.tabBtn, distTab === 'profile' && styles.tabBtnActive]}>
              <Text style={styles.tabText}>Profile</Text>
            </Pressable>
          </ScrollView>
        )}

        {currentUser?.role === 'retailer' && (
          <View>
            <ScrollView horizontal style={styles.tabScroll} showsHorizontalScrollIndicator={false}>
              <Pressable onPress={() => setDistTab('profile')} style={[styles.tabBtn, distTab === 'profile' && styles.tabBtnActive]}>
                <Text style={styles.tabText}>Profile</Text>
              </Pressable>
              <Pressable onPress={() => setDistTab('reports')} style={[styles.tabBtn, distTab === 'reports' && styles.tabBtnActive]}>
                <Text style={styles.tabText}>Reports</Text>
              </Pressable>
            </ScrollView>
            
            {distTab === 'reports' && (
                <View style={{flex: 1}}>
                    <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                        <Text style={styles.cardTitle}>Transaction History</Text>
                        <Pressable onPress={loadRetailerTransactions} style={styles.secondaryBtn}><Text style={styles.secondaryText}>Refresh</Text></Pressable>
                    </View>
                    <View style={{ marginBottom: 12 }}>
                        <TextInput placeholder="Filter Type (e.g. payment_cash)" value={txFilterType} onChangeText={setTxFilterType} style={[styles.input, { marginBottom: 8 }]} />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TextInput placeholder="From (YYYY-MM-DD)" value={txFilterDateFrom} onChangeText={setTxFilterDateFrom} style={[styles.input, { flex: 1, marginBottom: 0 }]} />
                            <TextInput placeholder="To (YYYY-MM-DD)" value={txFilterDateTo} onChangeText={setTxFilterDateTo} style={[styles.input, { flex: 1, marginBottom: 0 }]} />
                        </View>
                    </View>
                    {loading ? <Text>Loading...</Text> : null}
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    <FlatList
                        data={transactions}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={<Text style={styles.empty}>No transactions found</Text>}
                        renderItem={({ item }) => (
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>{item.type} - ₹{item.amount}</Text>
                                <Text style={styles.cardSubtitle}>{new Date(item.createdAt).toLocaleString()}</Text>
                                <Text style={styles.cardSubtitle}>{item.description || 'No description'}</Text>
                            </View>
                        )}
                    />
                </View>
            )}
          </View>
        )}

        {currentUser?.role === 'distributor' && distTab === 'retailers' && (
          <View style={{flex: 1}}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add Retailer</Text>
              <View style={styles.formCol}>
                <TextInput placeholder="Name" value={retName} onChangeText={setRetName} style={styles.input} />
                <TextInput placeholder="Phone" value={retPhone} onChangeText={setRetPhone} style={styles.input} />
                <TextInput placeholder="Address" value={retAddress} onChangeText={setRetAddress} style={styles.input} />
                <TextInput placeholder="Initial Balance" value={retBalance} onChangeText={setRetBalance} keyboardType="numeric" style={styles.input} />
                <Pressable onPress={createMyRetailer} style={styles.createBtn}><Text style={styles.createText}>Add</Text></Pressable>
              </View>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {loading ? <Text>Loading...</Text> : null}
            <FlatList
              data={retailers}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={styles.empty}>No retailers yet</Text>}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardSubtitle}>{item.phone}</Text>
                    <Text style={styles.cardSubtitle}>{item.address}</Text>
                    <Text style={{ fontWeight: '600', color: '#16a34a' }}>Bal: ₹{item.currentBalance ?? 0}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable onPress={() => toggleRetailerActive(item)} style={[styles.toggleBtn, item.active ? styles.activeOn : styles.activeOff]}>
                      <Text style={styles.toggleText}>{item.active ? 'Active' : 'Inactive'}</Text>
                    </Pressable>
                    <Pressable onPress={() => deleteMyRetailer(item)} style={styles.dangerBtn}><Text style={styles.dangerText}>Delete</Text></Pressable>
                  </View>
                </View>
              )}
            />
          </View>
        )}

        {/* Reuse Unit List for Distributor View */}
        {currentUser?.role === 'distributor' && distTab === 'units' && (
          <View style={{flex: 1}}>
             {/* Same Unit List View as Admin */}
             <View style={styles.formRow}>
              <TextInput placeholder="Search symbol" value={unitSymbolQuery} onChangeText={setUnitSymbolQuery} style={styles.input} />
              <Pressable onPress={loadUnits} style={styles.secondaryBtn}><Text style={styles.secondaryText}>Search</Text></Pressable>
            </View>
            <FlatList
              data={units}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{item.symbol}</Text>
                  <Text style={styles.cardSubtitle}>{item.formalName}</Text>
                </View>
              )}
            />
          </View>
        )}
        
        {/* Profile Tab */}
        {distTab === 'profile' && (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>My Profile</Text>
                <View style={styles.formCol}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput value={currentUser?.name} style={styles.input} editable={false} />
                    <Text style={styles.label}>Email</Text>
                    <TextInput value={currentUser?.email} style={styles.input} editable={false} />
                    <Text style={styles.label}>Role</Text>
                    <TextInput value={currentUser?.role} style={styles.input} editable={false} />
                </View>
            </View>
        )}

        <StatusBar style="auto" />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f5ff',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  centerContent: {
    justifyContent: 'center',
    paddingTop: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
    color: '#1e293b',
  },
  hero: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  heroIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  formCol: {
    gap: 12,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 0,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 4,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  roleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  roleBtnActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#f3e8ff',
  },
  roleText: {
    fontWeight: '500',
  },
  createBtn: {
    marginLeft: 'auto',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: 'center',
  },
  createText: {
    color: '#fff',
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryBtn: {
    backgroundColor: '#fff3d6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  secondaryText: {
    color: '#7a5c00',
    fontWeight: '600',
  },
  linkBtn: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignSelf: 'center',
  },
  linkText: {
    color: '#7c3aed',
    fontWeight: '600',
    fontSize: 15,
  },
  error: {
    color: '#ef4444',
    marginBottom: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  dangerBtn: {
    backgroundColor: '#fee',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d9534f',
  },
  dangerText: {
    color: '#d9534f',
    fontWeight: '600',
  },
  list: {
    gap: 8,
    paddingBottom: 20,
  },
  empty: {
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 16,
    gap: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  cardSubtitle: {
    color: '#64748b',
    marginTop: 2,
    marginBottom: 4,
    fontSize: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffe4e6',
    color: '#9f1239',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  activeOn: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  activeOff: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  toggleText: {
    fontWeight: '600',
    fontSize: 12,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  tabScroll: {
    marginBottom: 16,
    flexGrow: 0,
  },
  tabIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  tabBtnActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#f3e8ff',
  },
  tabText: {
    fontWeight: '600',
    color: '#333',
  },
  modal: {
    position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalCard: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    gap: 4,
  },
  statLine: {
    fontSize: 15,
    color: '#334155',
  },
  statItem: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 8,
    marginBottom: 2,
  },
  chartBox: {
    marginTop: 16,
    gap: 8,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartLabel: {
    width: 80,
    fontSize: 12,
    color: '#64748b',
  },
  chartBar: {
    height: 8,
    borderRadius: 4,
    flex: 1,
  },
  chartValue: {
    width: 30,
    fontSize: 12,
    textAlign: 'right',
    color: '#334155',
  },
});