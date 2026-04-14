<?php

return [

    'waste_types' => [
        'Used Oil', 'Chemical Waste',
        'Contaminated Rags / PPE', 'Batteries',
        'Paint / Coating Waste', 'Metal Scrap',
        'Plastic Waste', 'General Solid Waste',
        'Hazardous Waste', 'Recyclable Waste',
        'E-Waste / Electronic Waste', 'Sludge',
        'Biomedical / Medical Waste',
        'Asbestos Waste', 'Radioactive Waste',
        'Organic / Food Waste', 'Other',
    ],

    'waste_categories' => [
        'Hazardous',
        'Non-Hazardous',
        'Recyclable',
        'Special Waste',
        'Inert Waste',
    ],

    'hazard_classifications' => [
        'Flammable',
        'Toxic / Poisonous',
        'Corrosive',
        'Reactive',
        'Infectious / Biomedical',
        'Radioactive',
        'Oxidising',
        'Environmentally Hazardous',
        'Not Hazardous',
    ],

    'physical_forms' => [
        'Solid', 'Liquid', 'Sludge',
        'Gas / Vapour', 'Powder', 'Mixed',
    ],

    'units' => [
        'KG', 'Tonnes', 'Litres', 'M3',
        'Drums', 'Bags', 'Containers',
        'Bins', 'Boxes', 'Pallets', 'Skips',
    ],

    'packaging_types' => [
        'Drum (200L)', 'Drum (20L)', 'IBC Container',
        'Tanker', 'Skip', 'Bin', 'Pallet',
        'Bag', 'Box', 'Other',
    ],

    'treatment_methods' => [
        'Licensed Landfill',
        'Controlled Incineration',
        'Recycling / Recovery',
        'Chemical Treatment / Neutralisation',
        'Biological Treatment',
        'Physical Treatment',
        'Secure Long-Term Storage',
        'Return to Manufacturer / Supplier',
        'Energy Recovery',
        'Reuse',
        'Other',
    ],

    'vehicle_types' => [
        'Tanker', 'Flatbed Truck', 'Tipper Truck',
        'Skip Lorry', 'Cage Truck', 'Refrigerated Truck',
        'Pickup / Van', 'Other',
    ],

    'statuses' => [
        'Draft',
        'Prepared',
        'Ready for Dispatch',
        'Dispatched',
        'In Transit',
        'Received',
        'Completed',
        'Cancelled',
        'Rejected',
        'Under Review',
    ],

    'attachment_categories' => [
        'Waste Photo',
        'Container Label',
        'Vehicle Photo',
        'Manifest PDF',
        'Transporter License',
        'Transport Permit',
        'Weighing Slip',
        'Handover Receipt',
        'Disposal Certificate',
        'Receiving Note',
        'Compliance Document',
        'Signature / Scan',
        'Other',
    ],
];
