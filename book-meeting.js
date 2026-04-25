const EAssistant = require('./src/index');
const moment = require('moment-timezone');

async function bookMeeting() {
    console.log('🤖 Starting meeting booking...');
    
    const assistant = new EAssistant();
    
    // Calculate tomorrow 10 AM PDT
    const tomorrow = moment().tz('America/Los_Angeles').add(1, 'day').hour(10).minute(0).second(0);
    const startTime = tomorrow.toISOString();
    const endTime = tomorrow.clone().add(1, 'hour').toISOString();
    
    console.log(`📅 Booking meeting for: ${tomorrow.format('MMMM Do, YYYY [at] h:mm A z')}`);
    
    const meetingDetails = {
        title: "Meeting with Team",
        description: "Scheduled meeting via EAssistant",
        startTime: startTime,
        endTime: endTime,
        attendees: [
            { email: 'habibfahad@proton.me' }
        ]
    };
    
    try {
        // First check if the time slot is available
        console.log('🔍 Checking availability...');
        const isAvailable = await assistant.calendarService.checkAvailability(startTime, endTime);
        
        if (!isAvailable) {
            console.log('❌ Time slot not available. Finding alternatives...');
            const alternatives = await assistant.meetingService.suggestAlternativeSlots(meetingDetails);
            console.log('📋 Alternative slots:');
            alternatives.slice(0, 3).forEach((slot, index) => {
                console.log(`${index + 1}. ${slot.startFormatted} - ${slot.endFormatted}`);
            });
            return;
        }
        
        console.log('✅ Time slot available! Booking meeting...');
        
        // Book the meeting
        const result = await assistant.meetingService.bookMeeting(meetingDetails);
        
        if (result.success) {
            console.log('🎉 Meeting booked successfully!');
            console.log('📧 Calendar invitation sent to: habibfahad@proton.me');
            console.log('📋 Meeting details:');
            console.log(`   • Title: ${meetingDetails.title}`);
            console.log(`   • Date: ${tomorrow.format('MMMM Do, YYYY')}`);
            console.log(`   • Time: ${tomorrow.format('h:mm A z')}`);
            console.log(`   • Duration: 1 hour`);
            console.log(`   • Attendee: habibfahad@proton.me`);
        } else {
            console.log('❌ Failed to book meeting:', result.error);
            if (result.suggestions && result.suggestions.length > 0) {
                console.log('💡 Suggested alternative times:');
                result.suggestions.slice(0, 3).forEach((slot, index) => {
                    console.log(`${index + 1}. ${slot.startFormatted} - ${slot.endFormatted}`);
                });
            }
        }
    } catch (error) {
        console.error('💥 Error booking meeting:', error.message);
    }
}

// Run the booking
bookMeeting().catch(console.error);