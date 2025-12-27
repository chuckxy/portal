import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Address from '@/models/Address';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await dbConnect();

        const address = await Address.findById(params.id).populate('person', 'firstName lastName').populate('school', 'name').populate('site', 'siteName').populate('region', 'name').populate('country', 'name');

        if (!address) {
            return NextResponse.json({ error: 'Address not found' }, { status: 404 });
        }

        return NextResponse.json(address);
    } catch (error: any) {
        console.error('Error fetching address:', error);
        return NextResponse.json({ error: 'Failed to fetch address', message: error.message }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await dbConnect();

        const body = await request.json();

        // If this is being set as primary, unset other primary addresses for the same person
        if (body.isPrimary && body.person) {
            await Address.updateMany({ person: body.person, isPrimary: true, _id: { $ne: params.id } }, { $set: { isPrimary: false } });
        }

        const address = await Address.findByIdAndUpdate(params.id, body, {
            new: true,
            runValidators: true
        })
            .populate('person', 'firstName lastName')
            .populate('school', 'name')
            .populate('site', 'siteName')
            .populate('region', 'name')
            .populate('country', 'name');

        if (!address) {
            return NextResponse.json({ error: 'Address not found' }, { status: 404 });
        }

        return NextResponse.json(address);
    } catch (error: any) {
        console.error('Error updating address:', error);
        return NextResponse.json({ error: 'Failed to update address', message: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await dbConnect();

        const address = await Address.findByIdAndDelete(params.id);

        if (!address) {
            return NextResponse.json({ error: 'Address not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Address deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting address:', error);
        return NextResponse.json({ error: 'Failed to delete address', message: error.message }, { status: 500 });
    }
}
