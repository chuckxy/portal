import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Address from '@/models/Address';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const _id = searchParams.get('_id');
        const person = searchParams.get('person');
        const school = searchParams.get('school');
        const site = searchParams.get('site');
        const addressType = searchParams.get('addressType');
        const region = searchParams.get('region');
        const city = searchParams.get('city');
        const isPrimary = searchParams.get('isPrimary');
        const isActive = searchParams.get('isActive');

        const filter: any = {};

        if (_id) {
            filter._id = _id;
        }

        if (person) {
            filter.person = person;
        }

        if (school) {
            filter.school = school;
        }

        if (site) {
            filter.site = site;
        }

        if (addressType) {
            filter.addressType = addressType;
        }

        if (region) {
            filter.region = region;
        }

        if (city) {
            filter.city = { $regex: city, $options: 'i' };
        }

        if (isPrimary !== null && isPrimary !== undefined) {
            filter.isPrimary = isPrimary === 'true';
        }

        if (isActive !== null && isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const addresses = await Address.find(filter).populate('person', 'firstName lastName').populate('school', 'name').populate('site', 'siteName').populate('region', 'name').populate('country', 'name').sort({ isPrimary: -1, createdAt: -1 });

        // If searching by _id, return single object
        if (_id && addresses.length > 0) {
            return NextResponse.json(addresses[0]);
        }

        return NextResponse.json(addresses);
    } catch (error: any) {
        console.error('Error fetching addresses:', error);
        return NextResponse.json({ error: 'Failed to fetch addresses', message: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const body = await request.json();

        // If this is marked as primary, unset other primary addresses for the same person
        if (body.isPrimary && body.person) {
            await Address.updateMany({ person: body.person, isPrimary: true }, { $set: { isPrimary: false } });
        }

        const address: any = await Address.create(body);
        //ts-ignore
        const populatedAddress = await Address.findById(address._id).populate('person', 'firstName lastName').populate('school', 'name').populate('site', 'siteName').populate('region', 'name').populate('country', 'name');

        return NextResponse.json(populatedAddress, { status: 201 });
    } catch (error: any) {
        console.error('Error creating address:', error);
        return NextResponse.json({ error: 'Failed to create address', message: error.message }, { status: 500 });
    }
}
