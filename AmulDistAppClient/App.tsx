import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, Pressable, FlatList, Modal, ScrollView, Animated, Easing, Image } from 'react-native';

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

const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:4000'
  : Platform.OS === 'ios'
    ? 'http://localhost:4000'
    : 'http://10.0.2.2:4000';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [mode, setMode] = useState<'login' | 'signup' | 'admin' | 'user'>('login');
  const [adminTab, setAdminTab] = useState<'users' | 'stats' | 'products' | 'units'>('users');
  const [distTab, setDistTab] = useState<'retailers' | 'products' | 'units' | 'rates' | 'profile'>('retailers');

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

  const listUrl = useMemo(() => `${BASE_URL}/api/users`, []);

  async function login() {
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim().toLowerCase(), password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to login');
      setToken(data.token);
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
      const res = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: signupName.trim(), email: signupEmail.trim().toLowerCase(), password: signupPassword, role: signupRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to signup');
      setToken(data.token);
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
      const res = await fetch(`${BASE_URL}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
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
      const res = await fetch(`${BASE_URL}/api/products`, { headers: { Authorization: `Bearer ${token}` } });
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
      const res = await fetch(`${BASE_URL}/api/products`, {
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
      const res = await fetch(`${BASE_URL}/api/units?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
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
      const res = await fetch(`${BASE_URL}/api/units`, {
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
      const res = await fetch(`${BASE_URL}/api/products/${editProductUnits._id}`, {
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
      const res = await fetch(`${BASE_URL}/api/my/retailers`, { headers: { Authorization: `Bearer ${token}` } });
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
      const res = await fetch(`${BASE_URL}/api/my/retailers`, {
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
      const res = await fetch(`${BASE_URL}/api/my/retailers/${r._id}/status`, {
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
      const res = await fetch(`${BASE_URL}/api/my/retailers/${r._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
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
      const res = await fetch(`${BASE_URL}/api/my/rates`, { headers: { Authorization: `Bearer ${token}` } });
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
      const res = await fetch(`${BASE_URL}/api/my/rates`, {
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

  async function adminCreateUser() {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/users`, {
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
      const res = await fetch(`${BASE_URL}/api/users/${u._id}/status`, {
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
      const res = await fetch(`${BASE_URL}/api/users/${u._id}`, {
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
      const res = await fetch(`${BASE_URL}/api/users/${editUser._id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editUser.name, phone: editUser.phone, address: editUser.address, role: editUser.role, active: editUser.active }),
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
    const res = await fetch(`${BASE_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) setCurrentUser(data as User);
  }

  async function updateMyProfile(next: Partial<User>) {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/me/profile`, {
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

  if (mode === 'login') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>
        <View style={styles.formCol}>
          <TextInput placeholder="Email" value={loginEmail} onChangeText={setLoginEmail} autoCapitalize="none" style={styles.input} />
          <TextInput placeholder="Password" value={loginPassword} onChangeText={setLoginPassword} secureTextEntry style={styles.input} />
          <Pressable onPress={login} style={styles.primaryBtn}><Text style={styles.primaryText}>Login</Text></Pressable>
          <Pressable onPress={() => setMode('signup')} style={styles.linkBtn}><Text style={styles.linkText}>Create an account</Text></Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (mode === 'signup') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Sign Up</Text>
        <View style={styles.formCol}>
          <TextInput placeholder="Name" value={signupName} onChangeText={setSignupName} style={styles.input} />
          <TextInput placeholder="Email" value={signupEmail} onChangeText={setSignupEmail} autoCapitalize="none" style={styles.input} />
          <TextInput placeholder="Password" value={signupPassword} onChangeText={setSignupPassword} secureTextEntry style={styles.input} />
          <View style={styles.roleRow}>
            <Pressable onPress={() => setSignupRole('distributor')} style={[styles.roleBtn, signupRole === 'distributor' && styles.roleBtnActive]}>
              <Text style={styles.roleText}>Distributor</Text>
            </Pressable>
            <Pressable onPress={() => setSignupRole('retailer')} style={[styles.roleBtn, signupRole === 'retailer' && styles.roleBtnActive]}>
              <Text style={styles.roleText}>Retailer</Text>
            </Pressable>
          </View>
          <Pressable onPress={signup} style={styles.primaryBtn}><Text style={styles.primaryText}>Create Account</Text></Pressable>
          <Pressable onPress={() => setMode('login')} style={styles.linkBtn}><Text style={styles.linkText}>Back to Login</Text></Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (mode === 'user' && currentUser) {
    if (currentUser.role !== 'distributor') {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.formCol}>
            <TextInput placeholder="Name" value={currentUser.name} onChangeText={(t) => setCurrentUser({ ...currentUser, name: t })} editable={!currentUser.profileEditedOnce} style={styles.input} />
            <TextInput placeholder="Phone" value={currentUser.phone || ''} onChangeText={(t) => setCurrentUser({ ...currentUser, phone: t })} editable={!currentUser.profileEditedOnce} style={styles.input} />
            <TextInput placeholder="Address" value={currentUser.address || ''} onChangeText={(t) => setCurrentUser({ ...currentUser, address: t })} editable={!currentUser.profileEditedOnce} style={styles.input} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => updateMyProfile(currentUser)} disabled={!!currentUser.profileEditedOnce} style={[styles.primaryBtn, currentUser.profileEditedOnce && styles.disabledBtn]}>
                <Text style={styles.primaryText}>{currentUser.profileEditedOnce ? 'Profile Locked' : 'Save Profile'}</Text>
              </Pressable>
              <Pressable onPress={refreshMe} style={styles.secondaryBtn}><Text style={styles.secondaryText}>Refresh</Text></Pressable>
              <Pressable onPress={logout} style={styles.linkBtn}><Text style={styles.linkText}>Logout</Text></Pressable>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
          <StatusBar style="auto" />
        </View>
      );
    }

    useEffect(() => {
      if (distTab === 'retailers') loadMyRetailers();
      if (distTab === 'products') loadProducts();
      if (distTab === 'units') loadUnits();
      if (distTab === 'rates') { loadProducts(); loadRates(); }
    }, [distTab, token]);

    return (
    <View style={styles.container}>
      <Animated.View style={[styles.hero, { backgroundColor: bannerBg }]}> 
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image source={require('./assets/icon.png')} style={styles.heroIcon} />
            <Text style={styles.heroTitle}>Distributor Dashboard</Text>
          </View>
          <Pressable onPress={logout} style={styles.linkBtn}><Text style={styles.linkText}>Logout</Text></Pressable>
        </View>
      </Animated.View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
        <Pressable onPress={() => setDistTab('retailers')} style={[styles.tabBtn, distTab === 'retailers' && styles.tabBtnActive]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image source={require('./assets/icon.png')} style={styles.tabIcon} />
            <Text style={styles.tabText}>Retailers</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setDistTab('products')} style={[styles.tabBtn, distTab === 'products' && styles.tabBtnActive]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image source={require('./assets/icon.png')} style={styles.tabIcon} />
            <Text style={styles.tabText}>Products</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setDistTab('units')} style={[styles.tabBtn, distTab === 'units' && styles.tabBtnActive]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image source={require('./assets/icon.png')} style={styles.tabIcon} />
            <Text style={styles.tabText}>Units</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setDistTab('rates')} style={[styles.tabBtn, distTab === 'rates' && styles.tabBtnActive]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image source={require('./assets/icon.png')} style={styles.tabIcon} />
            <Text style={styles.tabText}>Rates</Text>
          </View>
        </Pressable>
      </ScrollView>

        {distTab === 'retailers' && (
          <View>
            <View style={styles.formCol}>
              <TextInput placeholder="Retailer name" value={retName} onChangeText={setRetName} style={styles.input} />
              <TextInput placeholder="Phone" value={retPhone} onChangeText={setRetPhone} style={styles.input} />
              <TextInput placeholder="Address" value={retAddress} onChangeText={setRetAddress} style={styles.input} />
              <TextInput placeholder="Opening balance" value={retBalance} onChangeText={setRetBalance} keyboardType="numeric" style={styles.input} />
              <Pressable onPress={createMyRetailer} style={styles.createBtn}><Text style={styles.createText}>Add Retailer</Text></Pressable>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {loading ? <Text>Loading...</Text> : null}
            <FlatList
              data={retailers}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={styles.empty}>No retailers</Text>}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardSubtitle}>{item.email}</Text>
                    <Text style={styles.cardSubtitle}>{item.phone || ''}</Text>
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
            {(() => {
              const totals = retailers.map((r) => r.currentBalance || 0);
              const max = Math.max(1, ...totals);
              const top = retailers.slice().sort((a, b) => (b.currentBalance || 0) - (a.currentBalance || 0)).slice(0, 5);
              return (
                <View style={styles.chartBox}>
                  {top.map((r) => (
                    <View key={r._id} style={styles.chartRow}>
                      <Text style={styles.chartLabel}>{r.name}</Text>
                      <View style={[styles.chartBar, { width: `${Math.round(((r.currentBalance || 0) / max) * 100)}%`, backgroundColor: '#0ea5e9' }]} />
                      <Text style={styles.chartValue}>{(r.currentBalance || 0).toFixed(0)}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>
        )}

        {distTab === 'products' && (
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
              ListEmptyComponent={<Text style={styles.empty}>No products</Text>}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.nameEnglish}</Text>
                    <Text style={styles.cardSubtitle}>{item.nameHindi}</Text>
                    <Text style={styles.cardSubtitle}>
                      {item.unit
                        ? `Unit: ${(units.find((x) => x._id === item.unit)?.symbol || item.unit)}`
                        : 'Unit: none'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={styles.badge}>{item.active ? 'active' : 'inactive'}</Text>
                    <Pressable
                      onPress={async () => {
                        setEditProductUnits(item);
                        setSelectedUnitId(item.unit || '');
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
          </View>
        )}

        {distTab === 'units' && (
          <View>
            <View style={styles.formCol}>
              <View style={styles.roleRow}>
                <Pressable onPress={() => setNewUnitType('Simple')} style={[styles.roleBtn, newUnitType === 'Simple' && styles.roleBtnActive]}>
                  <Text style={styles.roleText}>Simple</Text>
                </Pressable>
                <Pressable onPress={() => setNewUnitType('Compound')} style={[styles.roleBtn, newUnitType === 'Compound' && styles.roleBtnActive]}>
                  <Text style={styles.roleText}>Compound</Text>
                </Pressable>
              </View>
              <TextInput placeholder="Symbol" value={newUnitSymbol} onChangeText={setNewUnitSymbol} style={styles.input} />
              <TextInput placeholder="Formal name" value={newUnitFormalName} onChangeText={setNewUnitFormalName} style={styles.input} />
              <TextInput placeholder="Decimal places" value={newUnitDecimals} onChangeText={setNewUnitDecimals} keyboardType="numeric" style={styles.input} />
              <Pressable onPress={createUnit} style={styles.createBtn}><Text style={styles.createText}>Add Unit</Text></Pressable>
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

        {distTab === 'rates' && (
          <ScrollView contentContainerStyle={styles.list}>
            {products.map((p) => (
              <View key={p._id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{p.nameEnglish}</Text>
                  <Text style={styles.cardSubtitle}>{p.nameHindi}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    placeholder="Price"
                    value={rateMap[p._id] || ''}
                    onChangeText={(t) => setRateMap((prev) => ({ ...prev, [p._id]: t }))}
                    keyboardType="numeric"
                    style={[styles.input, { width: 100 }]}
                  />
                  <Pressable onPress={() => setRate(p._id)} style={styles.secondaryBtn}><Text style={styles.secondaryText}>Save</Text></Pressable>
                </View>
              </View>
            ))}
            {(() => {
              const setCount = rates.length;
              const totalCount = products.length;
              const max = Math.max(setCount, totalCount);
              return (
                <View style={styles.chartBox}>
                  <View style={styles.chartRow}>
                    <Text style={styles.chartLabel}>Rates Set</Text>
                    <View style={[styles.chartBar, { width: `${max ? Math.round((setCount / max) * 100) : 0}%`, backgroundColor: '#16a34a' }]} />
                    <Text style={styles.chartValue}>{setCount}</Text>
                  </View>
                  <View style={styles.chartRow}>
                    <Text style={styles.chartLabel}>Products</Text>
                    <View style={[styles.chartBar, { width: `${max ? Math.round((totalCount / max) * 100) : 0}%`, backgroundColor: '#7c3aed' }]} />
                    <Text style={styles.chartValue}>{totalCount}</Text>
                  </View>
                </View>
              );
            })()}
          </ScrollView>
        )}

        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.hero, { backgroundColor: bannerBg }]}> 
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image source={require('./assets/icon.png')} style={styles.heroIcon} />
            <Text style={styles.heroTitle}>Admin Dashboard</Text>
          </View>
          <Pressable onPress={logout} style={styles.linkBtn}><Text style={styles.linkText}>Logout</Text></Pressable>
        </View>
      </Animated.View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
        <Pressable onPress={() => setAdminTab('users')} style={[styles.tabBtn, adminTab === 'users' && styles.tabBtnActive]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image source={require('./assets/icon.png')} style={styles.tabIcon} />
            <Text style={styles.tabText}>Users</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setAdminTab('stats')} style={[styles.tabBtn, adminTab === 'stats' && styles.tabBtnActive]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image source={require('./assets/icon.png')} style={styles.tabIcon} />
            <Text style={styles.tabText}>Stats</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setAdminTab('products')} style={[styles.tabBtn, adminTab === 'products' && styles.tabBtnActive]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image source={require('./assets/icon.png')} style={styles.tabIcon} />
            <Text style={styles.tabText}>Products</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setAdminTab('units')} style={[styles.tabBtn, adminTab === 'units' && styles.tabBtnActive]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image source={require('./assets/icon.png')} style={styles.tabIcon} />
            <Text style={styles.tabText}>Units</Text>
          </View>
        </Pressable>
      </ScrollView>

      {adminTab === 'users' && (
      <View>
      <View style={styles.formRow}>
        <TextInput placeholder="Name" value={adminNewName} onChangeText={setAdminNewName} style={styles.input} />
        <TextInput placeholder="Email" value={adminNewEmail} onChangeText={setAdminNewEmail} autoCapitalize="none" style={styles.input} />
      </View>
      <View style={styles.formRow}>
        <TextInput placeholder="Password" value={adminNewPassword} onChangeText={setAdminNewPassword} secureTextEntry style={styles.input} />
        <View style={styles.roleRow}>
          <Pressable onPress={() => setAdminNewRole('distributor')} style={[styles.roleBtn, adminNewRole === 'distributor' && styles.roleBtnActive]}>
            <Text style={styles.roleText}>Distributor</Text>
          </Pressable>
          <Pressable onPress={() => setAdminNewRole('retailer')} style={[styles.roleBtn, adminNewRole === 'retailer' && styles.roleBtnActive]}>
            <Text style={styles.roleText}>Retailer</Text>
          </Pressable>
        </View>
        <Pressable onPress={adminCreateUser} style={styles.createBtn}><Text style={styles.createText}>Create</Text></Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
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
                    {item.unit
                      ? `Unit: ${(units.find((x) => x._id === item.unit)?.symbol || item.unit)}`
                      : 'Unit: none'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Text style={styles.badge}>{item.active ? 'active' : 'inactive'}</Text>
                  <Pressable
                    onPress={async () => {
                      setEditProductUnits(item);
                      setSelectedUnitId(item.unit || '');
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f5ff',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
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
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
  },
  createText: {
    color: '#fff',
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
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
    paddingVertical: 8,
  },
  linkText: {
    color: '#7c3aed',
    fontWeight: '500',
  },
  error: {
    color: '#d00',
    marginBottom: 8,
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
  },
  empty: {
    color: '#666',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: '#555',
    marginTop: 2,
    marginBottom: 6,
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
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  tabScroll: {
    gap: 8,
    marginBottom: 12,
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
  },
  modal: {
    position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    userSelect: 'none',
  },
  modalCard: {
    width: '90%',
    maxWidth: 480,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  chartBox: {
    marginTop: 12,
    gap: 8,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartLabel: {
    width: 110,
    fontWeight: '600',
  },
  chartBar: {
    height: 12,
    borderRadius: 999,
    flexGrow: 1,
    backgroundColor: '#7c3aed',
  },
  chartValue: {
    width: 40,
    textAlign: 'right',
    fontWeight: '600',
  },
  statLine: {
    fontWeight: '600',
  },
  statItem: {
    color: '#333',
  },
});
