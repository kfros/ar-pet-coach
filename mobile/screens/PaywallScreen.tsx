import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import RevenueCatService from '../services/revenueCatService';
import { PurchasesPackage } from 'react-native-purchases';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';

const PAYWALL_FALLBACK_CONFIG = {
    mode: 'fallback_if_no_offerings',
    fallback_products: [
        {
            identifier: 'yearly_plan',
            packageType: 'ANNUAL' as any,
            product: {
                identifier: 'yearly_plan',
                title: 'Annual Plan',
                price: 99,
                priceString: '$99/year',
                currencyCode: 'USD',
                description: '7-day free trial',
                introPrice: { price: 0 } as any // Trigger trial detection
            },
            highlight: true,
            badge: "Best Value"
        },
        {
            identifier: 'monthly_plan',
            packageType: 'MONTHLY' as any,
            product: {
                identifier: 'monthly_plan',
                title: 'Monthly Plan',
                price: 12.99,
                priceString: '$12.99/month',
                currencyCode: 'USD',
                description: '',
                introPrice: null
            },
            highlight: false
        }
    ],
    ui_mapping: {
        show_products: true,
        allow_selection: true,
        default_selected: 'yearly_plan'
    },
    cta: {
        text: "Get Full Access",
    },
    disclaimer: {
        restore_purchases_visible: true,
        footer_text: "Cancel anytime • No commitment • Secure payment",
        price_note: "Prices may vary by region"
    }
};

export default function PaywallScreen({ navigation }: any) {
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);

    const [subscriptionStatus, setSubscriptionStatus] = useState<{ isPremium: boolean, isTrial: boolean, daysLeft: number | null } | null>(null);
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

    // Fallback states
    const [isFallback, setIsFallback] = useState(false);
    const [fallbackLoadingMessage, setFallbackLoadingMessage] = useState<string | null>(null);
    const [fallbackError, setFallbackError] = useState<string | null>(null);

    useEffect(() => {
        loadOfferings();
        checkSubscription();
        checkTrialEligibilityHistory();
    }, []);

    const checkTrialEligibilityHistory = async () => {
        try {
            const customerInfo = await RevenueCatService.getCustomerInfo();
            // В RevenueCatService должна быть обертка над Purchases.getCustomerInfo()

            console.log("=== CHECKING TRIAL ELIGIBILITY HISTORY ===");

            // 1. Смотрим все прошлые и текущие подписки
            const allPurchasedProducts = customerInfo?.allPurchasedProductIdentifiers || [];
            console.log("All historical purchases:", allPurchasedProducts);

            // 2. Проверяем конкретно monthly
            if (allPurchasedProducts.includes('chillpup_monthly')) {
                console.log("🚨 VERDICT: User HAS purchased 'chillpup_monthly' in the past.");
                console.log("Google Play will NOT show a trial for 'New Customers Only' offers.");
            } else {
                console.log("✅ VERDICT: User has NEVER purchased 'chillpup_monthly'.");
                console.log("If the trial is missing, it's a configuration or cache issue.");
            }

            console.log("==========================================");
        }
        catch (e) {
            console.error("Failed to check history:", e);
        }
    };

    const checkSubscription = async () => {
        const status = await RevenueCatService.getSubscriptionStatus();
        if (status.isPremium) {
            let daysLeft = null;
            if (status.expirationDate) {
                const exp = new Date(status.expirationDate).getTime();
                const now = new Date().getTime();
                daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
            }
            setSubscriptionStatus({ ...status, daysLeft });
        }
    };

    const checkPackageForTrial = (pack: PurchasesPackage) => {
        // 1. Проверяем старое поле (на всякий случай)
        if (pack.product.introPrice) {
            console.log("Trial detected via introPrice");
            return true;
        }

        // 2. Проверяем современные фазы оплаты Google Play
        // Ищем фазу, где цена равна 0
        const hasFreePhase = pack.product.subscriptionOptions?.some(option =>
            option.pricingPhases.some(phase => phase.price.amountMicros === 0)
        );

        return !!hasFreePhase;
    };

    const loadOfferings = async () => {
        try {
            const result = await RevenueCatService.getOfferings();
            const currentOffering = result;
            console.log("Offering from RC:", JSON.stringify(currentOffering, null, 2));


            if (currentOffering && currentOffering.availablePackages && currentOffering.availablePackages.length > 0) {
                // Keep only Monthly and Annual
                const filtered = currentOffering.availablePackages.filter(p =>
                    p.packageType === 'ANNUAL' || p.packageType === 'MONTHLY'
                ).sort((a, b) => (a.packageType === 'ANNUAL' ? -1 : 1)); // Annual first for selection logic

                setPackages(filtered);
                // Default selection to Annual
                const annual = filtered.find(p => p.packageType === 'ANNUAL');
                if (annual) {
                    setSelectedPackage(annual);
                } else if (filtered.length > 0) {
                    setSelectedPackage(filtered[0]);
                }
                setIsFallback(false);
            } else {
                console.log("Triggering fallback: No real offerings found.");
                triggerFallback();
            }
        } catch (e) {
            console.error("RC Load Error:", e);
            triggerFallback();
        } finally {
            setLoading(false);
        }
    };

    const triggerFallback = () => {
        setIsFallback(true);
        const fallbackPackages = PAYWALL_FALLBACK_CONFIG.fallback_products as any as PurchasesPackage[];
        setPackages(fallbackPackages);

        const defaultSelectedId = PAYWALL_FALLBACK_CONFIG.ui_mapping.default_selected;
        const defaultPackage = fallbackPackages.find(p => p.identifier === defaultSelectedId);
        if (defaultPackage) {
            setSelectedPackage(defaultPackage);
        } else if (fallbackPackages.length > 0) {
            setSelectedPackage(fallbackPackages[0]);
        }
    };

    const handleSimulatedPurchase = async () => {
        setPurchasing(true);
        setFallbackError(null);
        console.log("Analytics: fallback_flow_started");

        // Step 1: Initial Loading
        setFallbackLoadingMessage("Connecting to App Store...");
        console.log("Analytics: fallback_loading_shown (Connecting)");
        await new Promise(resolve => setTimeout(resolve, 1200));

        // Step 2: Retry Loading
        setFallbackLoadingMessage("Still trying...");
        console.log("Analytics: fallback_loading_shown (Retrying)");
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 3: Failed
        setFallbackLoadingMessage(null);
        setFallbackError("Unable to connect to App Store");
        setPurchasing(false);
        console.log("Analytics: fallback_failed");
    };

    const handlePurchase = async () => {
        if (!selectedPackage) return;

        if (isFallback) {
            handleSimulatedPurchase();
            return;
        }

        setPurchasing(true);
        try {
            const customerInfo = await RevenueCatService.purchasePackage(selectedPackage);
            if (customerInfo && customerInfo.entitlements.active['ar-pet-coach-premium']) {
                Alert.alert('Success', 'You are now a Pro member!');
                navigation.goBack();
            }
        } catch (e) {
            console.log("Purchase cancelled or failed");
        } finally {
            setPurchasing(false);
        }
    };

    const handleRestore = async () => {
        setPurchasing(true);
        try {
            const customerInfo = await RevenueCatService.restorePurchases();
            if (customerInfo && customerInfo.entitlements.active['ar-pet-coach-premium']) {
                Alert.alert('Success', 'Purchases restored!');
                navigation.goBack();
            } else {
                Alert.alert('Info', 'No active subscription found to restore.');
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to restore purchases.');
        } finally {
            setPurchasing(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const annualPack = packages.find(p => p.packageType === 'ANNUAL');
    const monthlyPack = packages.find(p => p.packageType === 'MONTHLY');


    // Calculate savings if both exist
    let savings = 0;
    if (annualPack && monthlyPack) {
        const annualPrice = annualPack.product.price;
        const monthlyPrice = monthlyPack.product.price;
        const twelveMonthsPrice = monthlyPrice * 12;
        savings = Math.round(((twelveMonthsPrice - annualPrice) / twelveMonthsPrice) * 100);
    }

    const renderPriceCard = (pack: PurchasesPackage, isAnnual: boolean) => {
        const isSelected = selectedPackage?.identifier === pack.identifier;
        const monthlyEquivalent = isAnnual ? (pack.product.price / 12).toFixed(2) : pack.product.price.toFixed(2);
        const currency = pack.product.currencyCode === 'PLN' ? 'PLN' : (pack.product.currencyCode || '');

        // Check for trial
        const hasTrial = checkPackageForTrial(pack);
        const trialText = "7-day free trial"; // Requirement specified 7-day

        return (
            <Pressable
                key={pack.identifier}
                style={[
                    styles.packageCard,
                    isAnnual && styles.annualCard,
                    isSelected && styles.selectedCard,
                    isAnnual && isSelected && styles.selectedAnnualCard
                ]}
                onPress={() => setSelectedPackage(pack)}
            >
                {/* Badges (Chips) */}
                {(isAnnual || (pack as any).badge) && (
                    <View style={styles.bestValueBadge}>
                        <Text style={styles.bestValueText}>{(pack as any).badge || 'BEST VALUE'}</Text>
                    </View>
                )}



                <View style={[styles.cardContentRow, hasTrial && { marginTop: 12 }]}>
                    {/* Left Section: Circle + Title Stack */}
                    <View style={styles.leftSection}>
                        <View style={styles.selectionCircle}>
                            {isSelected && <View style={styles.selectionCircleInner} />}
                        </View>
                        <View style={styles.titleStack}>
                            <Text style={[styles.packageTitle, isSelected && styles.selectedText]}>
                                {isAnnual ? 'Annual' : 'Monthly'}
                            </Text>
                            {isAnnual && savings > 0 && (
                                <Text style={styles.savingsLabel}>Save {savings}%</Text>
                            )}
                        </View>
                    </View>

                    {/* Right Section: Price Stack */}
                    <View style={styles.rightSection}>
                        <View style={styles.priceContainer}>
                            {hasTrial ? (
                                <>
                                    {/* Текст триала */}
                                    <Text style={styles.trialPricePrefix}>
                                        {trialText}
                                    </Text>
                                    {/* Цена после триала */}
                                    <Text style={[styles.packagePrice, isSelected && styles.selectedText]}>
                                        {`then ${pack.product.priceString}`}
                                    </Text>
                                </>
                            ) : (
                                <Text style={[styles.packagePrice, isSelected && styles.selectedText]}>
                                    {pack.product.priceString}
                                </Text>
                            )}
                        </View>

                        {/* Цена в месяц (мелким шрифтом снизу) */}
                        <Text style={styles.packageMonthlyPrice}>
                            {isAnnual ? `(~${monthlyEquivalent} ${currency}/mo)` : 'No trial'}
                        </Text>
                    </View>
                </View>
            </Pressable>
        );
    };

    const hasSelectedTrial = selectedPackage ? checkPackageForTrial(selectedPackage) : false;

    return (
        <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                {subscriptionStatus?.isPremium && (
                    <View style={styles.trialStatusBanner}>
                        <Ionicons
                            name={subscriptionStatus.isTrial ? "time-outline" : "star"}
                            size={18}
                            color="#fff"
                        />
                        <Text style={styles.trialStatusText}>
                            {subscriptionStatus.isTrial
                                ? `Trial active • ${subscriptionStatus.daysLeft} days left`
                                : "Premium Active"}
                        </Text>
                    </View>
                )}

                <View style={[styles.header, subscriptionStatus?.isPremium && { marginTop: 16 }]}>
                    <Text style={styles.headline}>Build calm habits in just 21 days</Text>
                    <Text style={styles.subheadline}>
                        Train calm behavior in real-life situations using AR guided sessions.
                    </Text>
                </View>

                <View style={styles.benefitsContainer}>
                    <BenefitItem
                        icon="eye-outline"
                        title="Real-World AR Training"
                        description="Calm your dog in real situations via AR"
                    />
                    <BenefitItem
                        icon="analytics-outline"
                        title="Progress Tracking"
                        description="Identify anxiety patterns over time"
                    />
                    <BenefitItem
                        icon="heart-outline"
                        title="Expert Support"
                        isLast={!isDetailsExpanded}
                        description="Stress-relief with expert-validated routines"
                    />

                    {isDetailsExpanded && (
                        <View style={styles.expandedDetails}>
                            <View style={styles.divider} />
                            <Text style={styles.detailsText}>
                                AR sessions help bridge the gap between training and real-life triggers by overlaying calming guides in your home.
                            </Text>
                        </View>
                    )}

                    <Pressable
                        onPress={() => setIsDetailsExpanded(!isDetailsExpanded)}
                        style={styles.expandButton}
                    >
                        <Text style={styles.expandButtonText}>
                            {isDetailsExpanded ? 'Show less' : 'How it works?'}
                        </Text>
                        <Ionicons
                            name={isDetailsExpanded ? "chevron-up" : "chevron-down"}
                            size={14}
                            color={COLORS.textSecondary}
                        />
                    </Pressable>
                </View>

                <View style={styles.pricingSection}>
                    {annualPack && renderPriceCard(annualPack, true)}
                    {monthlyPack && renderPriceCard(monthlyPack, false)}
                </View>

                <View style={styles.ctaSection}>
                    <Text style={styles.preCtaText}>Start improving your dog’s behavior today</Text>

                    {/* Inline Feedback Message */}
                    {(fallbackLoadingMessage || fallbackError) && (
                        <View style={styles.inlineFeedbackContainer}>
                            {fallbackLoadingMessage ? (
                                <View style={styles.inlineLoadingRow}>
                                    <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
                                    <Text style={styles.inlineLoadingText}>{fallbackLoadingMessage}</Text>
                                </View>
                            ) : (
                                <Text style={styles.inlineErrorText}>{fallbackError}</Text>
                            )}
                        </View>
                    )}

                    <Pressable
                        style={({ pressed }) => [
                            styles.ctaButton,
                            (pressed || purchasing) && styles.ctaButtonPressed,
                            purchasing && { opacity: 0.8 }
                        ]}
                        onPress={handlePurchase}
                        disabled={purchasing}
                    >
                        {purchasing && !isFallback ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.ctaButtonText}>
                                {isFallback ? PAYWALL_FALLBACK_CONFIG.cta.text : (hasSelectedTrial ? 'Start 7-day free trial' : 'Get Full Access')}
                            </Text>
                        )}
                    </Pressable>

                    {hasSelectedTrial && (
                        <Text style={styles.transparencyText}>
                            No charge today • Cancel anytime before trial ends
                        </Text>
                    )}

                    <View style={styles.trustSignals}>
                        <Text style={styles.trustSignalText}>
                            {isFallback ? PAYWALL_FALLBACK_CONFIG.disclaimer.footer_text.split(' • ')[0] : 'Cancel anytime'}
                        </Text>
                        <View style={styles.dotSeparator} />
                        <Text style={styles.trustSignalText}>
                            {isFallback ? PAYWALL_FALLBACK_CONFIG.disclaimer.footer_text.split(' • ')[1] : 'No commitment'}
                        </Text>
                        <View style={styles.dotSeparator} />
                        <Text style={styles.trustSignalText}>
                            {isFallback ? PAYWALL_FALLBACK_CONFIG.disclaimer.footer_text.split(' • ')[2] : 'Secure payment'}
                        </Text>
                    </View>
                    {isFallback && (
                        <Text style={styles.priceNoteText}>{PAYWALL_FALLBACK_CONFIG.disclaimer.price_note}</Text>
                    )}
                </View>

                <View style={styles.footer}>
                    <Pressable onPress={handleRestore}>
                        <Text style={styles.restoreText}>Restore Purchases</Text>
                    </Pressable>
                </View>
            </ScrollView>

            {/* Close Button */}
            <Pressable
                style={styles.closeButton}
                onPress={() => navigation.goBack()}
            >
                <Ionicons name="close" size={28} color={COLORS.textSecondary} />
            </Pressable>
        </View>
    );
}

function BenefitItem({ icon, title, description, isLast }: { icon: any, title: string, description: string, isLast?: boolean }) {
    return (
        <View style={[styles.benefitItem, isLast && { marginBottom: 0 }]}>
            <View style={styles.benefitIconContainer}>
                <Ionicons name={icon} size={20} color={COLORS.primary} />
            </View>
            <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>{title}</Text>
                <Text style={styles.benefitDescription}>{description}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 40,
        backgroundColor: COLORS.backgroundLight,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundLight,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    headline: {
        ...FONTS.h1,
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 34,
    },
    subheadline: {
        ...FONTS.body,
        color: COLORS.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 10,
        lineHeight: 22,
    },
    benefitsContainer: {
        marginBottom: 24,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(229, 231, 235, 0.5)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    benefitItem: {
        flexDirection: 'row',
        marginBottom: 14,
    },
    benefitIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: 'rgba(240, 253, 244, 0.4)', // Lower opacity mint fill
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    benefitTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    benefitTitle: {
        fontWeight: 'bold',
        fontSize: 15,
        color: COLORS.text,
        marginBottom: 1,
    },
    benefitDescription: {
        fontSize: 13.5,
        color: 'rgba(75, 85, 99, 0.8)', // Lowered secondary text opacity
        lineHeight: 16.5,
    },
    pricingSection: {
        gap: 16,
        marginBottom: 32,
    },
    packageCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        position: 'relative',
        overflow: 'hidden',
        gap: 12,
    },
    annualCard: {
        borderColor: COLORS.primaryLight,
        backgroundColor: COLORS.mint,
    },
    selectedCard: {
        borderColor: COLORS.primary,
        backgroundColor: '#fff',
    },
    selectedAnnualCard: {
        backgroundColor: COLORS.mint,
        borderColor: COLORS.primary,
    },
    bestValueBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderBottomLeftRadius: 12,
    },
    bestValueText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    cardContentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    titleStack: {
        justifyContent: 'center',
    },
    selectionCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectionCircleInner: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: COLORS.primary,
    },
    packageTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    savingsLabel: {
        fontSize: 14,
        color: '#059669', // Brand green for savings
        fontWeight: '600',
        marginTop: 2,
    },
    rightSection: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginLeft: 8, // Небольшой отступ от заголовка
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    packagePrice: {
        fontSize: 17,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    packageMonthlyPrice: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    selectedText: {
        color: COLORS.text,
    },
    ctaSection: {
        alignItems: 'center',
    },
    preCtaText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 12,
        fontWeight: '500',
    },
    ctaButton: {
        backgroundColor: COLORS.primary,
        width: '100%',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    ctaButtonPressed: {
        backgroundColor: COLORS.primaryDark,
        transform: [{ scale: 0.98 }],
    },
    ctaButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    transparencyText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 12,
        textAlign: 'center',
    },
    trustSignals: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
    },
    trustSignalText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    dotSeparator: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#D1D5DB',
        marginHorizontal: 8,
    },
    footer: {
        marginTop: 32,
        alignItems: 'center',
    },
    restoreText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textDecorationLine: 'underline',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    trialBadgeAbsolute: {
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: '#EDE9FE',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderBottomRightRadius: 12,
        zIndex: 1,
    },
    trialBadgeText: {
        color: '#7C3AED', // Stronger purple for visibility
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    trialPricePrefix: {
        color: '#0D9488', // Teal for trial text
        fontWeight: 'bold',
        fontSize: 13, // Чуть уменьшим, чтобы не теснилось
        marginBottom: -2,
    },
    trialStatusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 8,
        gap: 8,
    },
    trialStatusText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    expandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 8,
        marginTop: 4,
    },
    expandButtonText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginRight: 4,
        fontWeight: '600',
    },
    expandedDetails: {
        marginTop: 4,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(229, 231, 235, 0.4)',
        marginVertical: 12,
    },
    detailsText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    inlineFeedbackContainer: {
        width: '100%',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inlineLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inlineLoadingText: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    inlineErrorText: {
        fontSize: 14,
        color: '#8e8e93', // Red-600
        fontWeight: '600',
        textAlign: 'center',
    },
    priceNoteText: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 8,
        opacity: 0.7,
    },
});
