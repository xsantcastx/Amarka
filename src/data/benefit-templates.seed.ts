/**
 * Seed script for benefit templates
 * Run this to populate the database with default benefit templates
 * 
 * To use: Import and call seedBenefitTemplates() from your seed admin page
 */

import { BenefitTemplate } from '../app/models/benefit-template';

export const DEFAULT_BENEFIT_TEMPLATES: Omit<BenefitTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // ========== ENGRAVED GIFTS BENEFITS ==========
  {
    name: 'Gifts - Premium Craftsmanship',
    category: 'gifts',
    icon: 'performance',
    iconColor: 'purple-500',
    title: 'Premium Craftsmanship',
    description: 'Laser-precise engraving on premium materials for exceptional detail and lasting quality.',
    isActive: true,
    order: 1
  },
  {
    name: 'Gifts - Personalized Touch',
    category: 'gifts',
    icon: 'design',
    iconColor: 'blue-500',
    title: 'Personalized Touch',
    description: 'Custom engraving transforms each piece into a unique, meaningful gift that creates lasting memories.',
    isActive: true,
    order: 2
  },
  {
    name: 'Gifts - Fast Turnaround',
    category: 'gifts',
    icon: 'efficiency',
    iconColor: 'green-500',
    title: 'Fast Turnaround',
    description: 'Quick production and shipping ensures your personalized gift arrives when you need it.',
    isActive: true,
    order: 3
  },
  {
    name: 'Gifts - Gift-Ready Packaging',
    category: 'gifts',
    icon: 'quality',
    iconColor: 'gold-500',
    title: 'Gift-Ready Packaging',
    description: 'Beautiful presentation packaging makes every item ready to give without additional wrapping.',
    isActive: true,
    order: 4
  },
  {
    name: 'Gifts - Quality Guarantee',
    category: 'gifts',
    icon: 'warranty',
    iconColor: 'purple-500',
    title: 'Quality Guarantee',
    description: 'We stand behind our craftsmanship with a satisfaction guarantee on all engraved products.',
    isActive: true,
    order: 5
  },
  {
    name: 'Gifts - Perfect for Any Occasion',
    category: 'gifts',
    icon: 'value',
    iconColor: 'pink-500',
    title: 'Perfect for Any Occasion',
    description: 'From corporate gifts to weddings and milestones, our engraved items suit every special moment.',
    isActive: true,
    order: 6
  },

  // ========== ACCESSORY BENEFITS ==========
  {
    name: 'Accessory - Premium Quality',
    category: 'accessory',
    icon: 'quality',
    iconColor: 'purple-500',
    title: 'Premium Quality',
    description: 'Crafted from high-grade materials for exceptional durability and a luxurious feel.',
    isActive: true,
    order: 10
  },
  {
    name: 'Accessory - Unique Design',
    category: 'accessory',
    icon: 'design',
    iconColor: 'blue-500',
    title: 'Unique Design',
    description: 'Stand out with exclusive custom designs that showcase your personal style.',
    isActive: true,
    order: 11
  },
  {
    name: 'Accessory - Great Value',
    category: 'accessory',
    icon: 'value',
    iconColor: 'green-500',
    title: 'Great Value',
    description: 'Premium quality at competitive prices makes this the perfect gift or personal accessory.',
    isActive: true,
    order: 12
  },
  {
    name: 'Accessory - Satisfaction Guaranteed',
    category: 'accessory',
    icon: 'warranty',
    iconColor: 'gold-500',
    title: 'Satisfaction Guaranteed',
    description: 'We stand behind our products with a satisfaction guarantee and responsive customer service.',
    isActive: true,
    order: 13
  },

  // ========== CUSTOM ENGRAVING BENEFITS ==========
  {
    name: 'Custom - Precision Engraving',
    category: 'custom',
    icon: 'security',
    iconColor: 'purple-500',
    title: 'Precision Engraving',
    description: 'Advanced laser technology delivers crisp, detailed engraving that lasts a lifetime.',
    isActive: true,
    order: 20
  },
  {
    name: 'Custom - Multiple Materials',
    category: 'custom',
    icon: 'quality',
    iconColor: 'blue-500',
    title: 'Multiple Materials',
    description: 'Engrave on glass, wood, metal, leather, and more with consistent, professional results.',
    isActive: true,
    order: 21
  },
  {
    name: 'Custom - Expert Guidance',
    category: 'custom',
    icon: 'support',
    iconColor: 'green-500',
    title: 'Expert Guidance',
    description: 'Our design team helps you create the perfect personalized piece for any occasion.',
    isActive: true,
    order: 22
  },
  {
    name: 'Custom - Trusted Quality',
    category: 'custom',
    icon: 'reliability',
    iconColor: 'gold-500',
    title: 'Trusted Quality',
    description: 'Thousands of satisfied customers trust us for their personalized gifts and engraving needs.',
    isActive: true,
    order: 23
  },

  // ========== GENERAL BENEFITS (apply to all) ==========
  {
    name: 'General - Fast Shipping',
    category: 'general',
    icon: 'efficiency',
    iconColor: 'purple-500',
    title: 'Fast Worldwide Shipping',
    description: 'Quick and reliable delivery to your location with full tracking and insurance.',
    isActive: true,
    order: 100
  },
  {
    name: 'General - Secure Payment',
    category: 'general',
    icon: 'security',
    iconColor: 'green-500',
    title: 'Secure Payment',
    description: 'Multiple payment options for your convenience and security.',
    isActive: true,
    order: 101
  }
];
