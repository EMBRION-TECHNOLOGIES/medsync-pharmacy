# Production Migration Guide - Socket Sanitization

## 🎯 **Migration Overview**

This guide outlines the step-by-step process for migrating the MedSync Pharmacy Web App to the new socket architecture in production.

## 📋 **Pre-Migration Checklist**

### ✅ **Frontend Ready**
- [x] New socket service implemented with canonical contracts
- [x] Feature flags configured for gradual migration
- [x] Legacy event support enabled during transition
- [x] All pages updated to use new socket hooks
- [x] Connection status component added
- [x] Error handling implemented

### 🔄 **Backend Requirements**
- [ ] Backend team implements dual namespace support
- [ ] Backend emits canonical events (`chat:message`, `order:new`, etc.)
- [ ] Backend maintains legacy events during migration
- [ ] Backend supports new room naming convention
- [ ] Backend JWT authentication working with new namespace

## 🚀 **Migration Steps**

### **Step 1: Pre-Migration Testing**

#### **1.1 Backend Verification**
```bash
# Test backend dual namespace support
curl -X GET "http://192.168.1.97:3000/socket.io/?EIO=4&transport=polling"
curl -X GET "http://192.168.1.97:3000/patient-pharmacy/socket.io/?EIO=4&transport=polling"
```

#### **1.2 Frontend Testing**
```bash
# Test with current configuration
npm run dev

# Verify socket connection in browser dev tools
# Check Network tab for socket.io requests
# Verify connection status in topbar
```

### **Step 2: Environment Configuration Update**

#### **2.1 Update Production Environment Variables**

**Before Migration:**
```env
NEXT_PUBLIC_SOCKET_NAMESPACE=/
NEXT_PUBLIC_ENABLE_LEGACY_EVENTS=true
```

**After Migration:**
```env
NEXT_PUBLIC_SOCKET_NAMESPACE=/patient-pharmacy
NEXT_PUBLIC_ENABLE_LEGACY_EVENTS=false
```

#### **2.2 Update next.config.ts**
```typescript
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.97:3000/api/v1',
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://192.168.1.97:3000',
    // Socket sanitization feature flags
    NEXT_PUBLIC_SOCKET_NAMESPACE: process.env.NEXT_PUBLIC_SOCKET_NAMESPACE || '/patient-pharmacy',
    NEXT_PUBLIC_ENABLE_LEGACY_EVENTS: process.env.NEXT_PUBLIC_ENABLE_LEGACY_EVENTS || 'false',
  },
};
```

### **Step 3: Production Deployment**

#### **3.1 Deploy with New Configuration**
```bash
# Build with new environment variables
npm run build

# Deploy to production
# (Follow your deployment process)
```

#### **3.2 Monitor Deployment**
- [ ] Check deployment logs for errors
- [ ] Verify socket connections in production
- [ ] Monitor error rates
- [ ] Check user reports

### **Step 4: Post-Migration Monitoring**

#### **4.1 Real-Time Monitoring (First 24 Hours)**

**Key Metrics to Monitor:**
- Socket connection success rate
- Real-time update delivery
- Error rates
- User complaints

**Monitoring Commands:**
```bash
# Check socket connections
curl -X GET "https://your-domain.com/patient-pharmacy/socket.io/?EIO=4&transport=polling"

# Monitor error logs
tail -f /var/log/your-app/error.log | grep -i socket

# Check connection status
# Monitor browser dev tools in production
```

#### **4.2 User Experience Verification**
- [ ] Chat messages appear instantly
- [ ] Order updates show in real-time
- [ ] Dispatch tracking works
- [ ] Connection status accurate
- [ ] No duplicate events
- [ ] Typing indicators working

### **Step 5: Rollback Plan**

#### **5.1 Rollback Triggers**
- Socket connection failure rate > 5%
- User complaints about real-time features
- Critical errors in production logs
- Performance degradation

#### **5.2 Rollback Procedure**
```bash
# 1. Revert environment variables
NEXT_PUBLIC_SOCKET_NAMESPACE=/
NEXT_PUBLIC_ENABLE_LEGACY_EVENTS=true

# 2. Redeploy immediately
npm run build
# Deploy to production

# 3. Verify rollback success
# Check socket connections
# Monitor error rates
# Verify real-time features working
```

## 📊 **Success Metrics**

### **Technical Metrics**
- [ ] Socket connection success rate > 99%
- [ ] Message delivery latency < 500ms
- [ ] Zero duplicate events in production
- [ ] Cache hit rate > 90%

### **User Experience Metrics**
- [ ] Real-time updates work seamlessly
- [ ] No user-reported connection issues
- [ ] Chat responsiveness maintained
- [ ] Order processing speed unchanged

## 🚨 **Risk Mitigation**

### **High Risk Items**
1. **Socket namespace change** - Could break real-time features
   - *Mitigation*: Dual namespace support during transition
   - *Rollback*: Revert environment variable

2. **Legacy event removal** - Could break existing functionality
   - *Mitigation*: Feature flag for gradual migration
   - *Rollback*: Re-enable legacy events

### **Monitoring Points**
- Socket connection errors
- Real-time update failures
- User complaints
- Performance metrics
- Error logs

## 📞 **Communication Plan**

### **Before Migration**
- [ ] Notify backend team of migration timing
- [ ] Schedule maintenance window if needed
- [ ] Prepare rollback plan
- [ ] Set up monitoring alerts

### **During Migration**
- [ ] Monitor deployment closely
- [ ] Watch error rates
- [ ] Check user feedback
- [ ] Be ready to rollback if needed

### **After Migration**
- [ ] Confirm success metrics
- [ ] Notify team of completion
- [ ] Document lessons learned
- [ ] Plan legacy code cleanup

## 🎯 **Post-Migration Tasks**

### **Immediate (First 24 Hours)**
- [ ] Monitor production metrics
- [ ] Respond to any issues
- [ ] Verify all features working
- [ ] Document any problems

### **Short Term (Next Week)**
- [ ] Clean up legacy code
- [ ] Remove deprecated hooks
- [ ] Update documentation
- [ ] Performance optimization

### **Long Term (Next Month)**
- [ ] Remove feature flags
- [ ] Clean up environment variables
- [ ] Update deployment scripts
- [ ] Train team on new architecture

---

**Migration Date**: TBD  
**Migration Lead**: Development Team  
**Backend Contact**: Backend Team  
**Status**: Ready for Migration
