import { termsContent } from './terms';
import { privacyContent } from './privacy';
import { refundContent } from './refund';
import { shippingContent } from './shipping';

interface Policy {
    title: string;
    content: string;
}

interface PolicyMap {
    [key: string]: Policy;
}

export const policies: PolicyMap = {
    'terms': {
        title: 'Terms and Conditions',
        content: termsContent,
    },
    'privacy': {
        title: 'Privacy Policy',
        content: privacyContent,
    },
    'refund': {
        title: 'Refund Policy',
        content: refundContent,
    },
    'shipping': {
        title: 'Shipping Policy',
        content: shippingContent,
    },
};
