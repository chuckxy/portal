import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Bank, { IBank } from '@/models/Bank';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const _id = searchParams.get('_id');
        const accountNumber = searchParams.get('accountNumber');
        const accountName = searchParams.get('accountName');
        const bankName = searchParams.get('bankName');
        const person = searchParams.get('person');
        const school = searchParams.get('school');
        const isActive = searchParams.get('isActive');

        const filter: any = {};

        if (_id) {
            filter._id = _id;
        }

        if (accountNumber) {
            filter.accountNumber = { $regex: accountNumber, $options: 'i' };
        }

        if (accountName) {
            filter.accountName = { $regex: accountName, $options: 'i' };
        }

        if (bankName) {
            filter.bankName = { $regex: bankName, $options: 'i' };
        }

        if (person) {
            filter.person = person;
        }

        if (school) {
            filter.school = school;
        }

        if (isActive !== null && isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const banks = await Bank.find(filter).populate('person', 'firstName lastName').populate('school', 'name').sort({ createdAt: -1 });

        // If searching by _id, return single object
        if (_id && banks.length > 0) {
            return NextResponse.json(banks[0]);
        }

        return NextResponse.json(banks);
    } catch (error: any) {
        console.error('Error fetching banks:', error);
        return NextResponse.json({ error: 'Failed to fetch banks', message: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const body = await request.json();
        const bank = await Bank.create(body);
        const populatedBank = await Bank.findOne({ code: body.code }).populate('person', 'firstName lastName').populate('school', 'name');

        return NextResponse.json(populatedBank, { status: 201 });
    } catch (error: any) {
        console.error('Error creating bank:', error);
        return NextResponse.json({ error: 'Failed to create bank', message: error.message }, { status: 500 });
    }
}
