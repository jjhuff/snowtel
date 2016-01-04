//------------------------------------------------------------------------------
//   AVR-Temp Sensor
//   bitman@bitmania.de
//   www.bitmania.de
//------------------------------------------------------------------------------
// Based on the publication:
//		Using DS18B20 digital temperature sensor on AVR microcontrollers
//		Description and application, Version 1.0 (Preliminary)
//		by Gerard Marull Paretas, September 2007
//------------------------------------------------------------------------------
// Fuses
//  set 16MHz:		avrdude -c avrispv2 -P usb -p m88 -U lfuse:w:0xFF:m -U hfuse:w:0xDF:m
//  read current:	avrdude -v -c avrispv2 -P usb -p m88
//  ATmega88
//------------------------------------------------------------------------------
#include <avr/io.h>
#include <avr/interrupt.h>

#include <util/delay.h>
// LCD
//#include <stdlib.h>
//#include <avr/pgmspace.h>

double therm_read_temperature(void);

/* Thermometer Connections (At your choice) */
#define THERM_PORT           PORTD
#define THERM_DDR            DDRD
#define THERM_PIN            PIND
#define THERM_DQ             PD7

/* Utils */
#define THERM_INPUT_MODE()	THERM_DDR&=~(1<<THERM_DQ)
#define THERM_OUTPUT_MODE() THERM_DDR|=(1<<THERM_DQ)
#define THERM_LOW()			THERM_PORT&=~(1<<THERM_DQ)
#define THERM_HIGH()		THERM_PORT|=(1<<THERM_DQ)

#define THERM_CMD_CONVERTTEMP   0x44
#define THERM_CMD_RSCRATCHPAD   0xbe
#define THERM_CMD_WSCRATCHPAD   0x4e
#define THERM_CMD_CPYSCRATCHPAD 0x48
#define THERM_CMD_RECEEPROM     0xb8
#define THERM_CMD_RPWRSUPPLY    0xb4
#define THERM_CMD_SEARCHROM     0xf0
#define THERM_CMD_READROM       0x33
#define THERM_CMD_MATCHROM      0x55
#define THERM_CMD_SKIPROM       0xcc
#define THERM_CMD_ALARMSEARCH   0xec
