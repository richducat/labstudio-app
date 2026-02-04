# TYFYS Zoho Deals — Keep / Move / Hide List (for Client Processing TEST layout)
Generated: 2026-02-04T03:48:34.230Z

### Summary
- Total Deal fields: **152**
- Fields with any value in a 30-deal pipeline sample: **87**
- This is a **layout change plan** (we are not deleting fields).

---

# KEEP (visible in the TEST layout)

## Action Center (top) (5)
- **Deal Owner** (Owner, ownerlookup) — used_in_sample:30/30
- **Last Activity Time** (Last_Activity_Time, datetime) — used_in_sample:30/30
- **Next Step** (Next_Step, text) — used_in_sample:28/30
- **Provider** (Provider, multiselectpicklist) — used_in_sample:30/30
- **Stage** (Stage, picklist) — used_in_sample:30/30

## Client Snapshot (7)
- **Apt** (Apt, text) — used_in_sample:1/30
- **Contact Name** (Contact_Name, lookup) — used_in_sample:28/30
- **Email Address** (Email_Address, email) — used_in_sample:27/30
- **Phone Number** (Phone_Number, phone) — used_in_sample:30/30
- **State** (State, text) — used_in_sample:30/30
- **Street** (Street, text) — used_in_sample:12/30
- **Zip code** (Zip_code, text) — used_in_sample:30/30

## Needs / Claim Summary
- Note: you asked to keep all 3 sources (Conditions subform + Current Disabilities + Veteran stated). We will keep them, but show a new Working Summary field above them.

## Needs fields (existing) (5)
- **Conditions** (Conditions, subform) — mostly_empty_in_sample
- **Current Disabilities** (Disabilities, multiselectpicklist) — used_in_sample:1/30
- **Description** (Description, textarea) — used_in_sample:1/30
- **Projected Disabilities** (Projected_Disabilities, multiselectpicklist) — used_in_sample:1/30
- **Veteran Current Disabilities (stated)** (Veteran_Current_Disabilities_stated, textarea) — used_in_sample:2/30

## Documents / Links (candidates; we will prune to the 5–10 you actually use) (29)
- **Access To Service Treatment Records** (Access_To_Service_Health_Records, picklist) — used_in_sample:2/30
- **Additional Docs link** (Additional_Docs_link, text) — mostly_empty_in_sample
- **Blue Button Record** (Blue_Button_Record, text) — mostly_empty_in_sample
- **C-File Upload link** (C_File_Upload_link, text) — mostly_empty_in_sample
- **Claim Documents Required** (Claim_Documents_Required, picklist) — mostly_empty_in_sample
- **DBQ Assignment Date** (DBQ_Assignment_Date, date) — mostly_empty_in_sample
- **DBQ Completion Date** (DBQ_Completion_Date, date) — mostly_empty_in_sample
- **DBQ Notes & Summary Link** (DBQ_Notes_Summary_Link, text) — mostly_empty_in_sample
- **DBQ Status** (DBQ_Status, picklist) — used_in_sample:4/30
- **DBQs Ready?** (DBQs_Ready, picklist) — mostly_empty_in_sample
- **DD214 Upload link** (DD214_Upload_link, text) — mostly_empty_in_sample
- **DIC Completed** (DIC_Completed, boolean) — used_in_sample:30/30
- **DIC Notes & Summary Link** (DIC_Notes_Summary_Link, text) — mostly_empty_in_sample
- **Document Collection Complete?** (Document_Collection_Complete1, picklist) — used_in_sample:1/30
- **Document Intake Consultation (DIC) Date** (Document_Intake_Consultation_DIC_Date, date) — used_in_sample:3/30
- **Document Status** (Document_Status, picklist) — used_in_sample:5/30
- **Evidence Packet Ready** (Evidence_Packet_Ready, picklist) — mostly_empty_in_sample
- **mDBQs** (mDBQs, multiselectpicklist) — used_in_sample:2/30
- **Medical Notes & mDBQs** (Medical_Notes_mDBQs, text) — mostly_empty_in_sample
- **Medical Provider** (Medical_Provider, text) — used_in_sample:7/30
- **Medical Strategy (MS) Completed** (Medical_Strategy_MS_Completed, boolean) — used_in_sample:30/30
- **Medical Strategy Completed?** (Medical_Strategy_Completed, picklist) — mostly_empty_in_sample
- **MS Notes & Summary Link** (MS_Notes_Summary_Link, picklist) — used_in_sample:2/30
- **My HealthyVet Upload link** (My_HealthyVet_Upload_link, text) — mostly_empty_in_sample
- **Private Medical Records Upload link** (Private_Medical_Records_Upload_link, text) — mostly_empty_in_sample
- **Required DBQs** (Required_DBQs, text) — used_in_sample:4/30
- **Service Treatment Records** (Military_Service_Records_Upload_link, text) — mostly_empty_in_sample
- **Street** (Street, text) — used_in_sample:12/30
- **Veteran Needs Assistance with MDBQS** (Veteran_Needs_Assistance_with_MDBQS, picklist) — mostly_empty_in_sample

## Provider section (visible only in Ready/Sent) (5)
- **Medical Provider** (Medical_Provider, text) — used_in_sample:7/30
- **Provider** (Provider, multiselectpicklist) — used_in_sample:30/30
- **Provider Release Signed** (Provider_Release_Signed, picklist) — mostly_empty_in_sample
- **Provider Summary Complete?** (Provider_Summary_Complete, picklist) — mostly_empty_in_sample
- **Ready For Provider?** (Ready_For_Provider, picklist) — mostly_empty_in_sample

## Finance section (collapsed) (3)
- **Amount** (Amount, currency) — used_in_sample:5/30
- **Paid Services Consent Acknowledged** (Paid_Services_Consent_Acknowledged, picklist) — used_in_sample:1/30
- **Payment Status** (Payment_Status, picklist) — used_in_sample:3/30

---

# MOVE TO “MARKETING / ATTRIBUTION” (collapsed)

## Marketing / Attribution (20)
- **Ad Campaign Name** (Ad_Campaign_Name, text) — mostly_empty_in_sample
- **Ad Click Date** (Ad_Click_Date, date) — mostly_empty_in_sample
- **Ad Network** (Ad_Network, picklist) — mostly_empty_in_sample
- **AdGroup Name** (AdGroup_Name, text) — mostly_empty_in_sample
- **ADGROUPID** (ADGROUPID, text) — mostly_empty_in_sample
- **Campaign Source** (Campaign_Source, lookup) — mostly_empty_in_sample
- **Click Type** (Click_Type, picklist) — mostly_empty_in_sample
- **Conversion Export Status** (Conversion_Export_Status, picklist) — mostly_empty_in_sample
- **Conversion Exported On** (Conversion_Exported_On, datetime) — mostly_empty_in_sample
- **Cost per Click** (Cost_per_Click, currency) — used_in_sample:30/30
- **Cost per Conversion** (Cost_per_Conversion, currency) — used_in_sample:30/30
- **Device Type** (Device_Type, picklist) — mostly_empty_in_sample
- **GCLID** (GCLID, text) — mostly_empty_in_sample
- **Keyword** (Keyword, text) — mostly_empty_in_sample
- **KEYWORDID** (KEYWORDID, text) — mostly_empty_in_sample
- **Lead Conversion Time** (Lead_Conversion_Time, integer) — used_in_sample:22/30
- **Lead Source** (Lead_Source, picklist) — used_in_sample:6/30
- **Reason for Conversion Failure** (Reason_for_Conversion_Failure, picklist) — mostly_empty_in_sample
- **Search Partner Network** (Search_Partner_Network, picklist) — mostly_empty_in_sample
- **ZCAMPAIGNID** (ZCAMPAIGNID, text) — mostly_empty_in_sample

---

# MOVE TO “ADMIN / SYSTEM” (collapsed or hidden)

## Admin / System-ish (9)
- **Created By** (Created_By, ownerlookup) — used_in_sample:30/30
- **Created Time** (Created_Time, datetime) — used_in_sample:30/30
- **Implementation Stage** (Implementation_Stage, picklist) — mostly_empty_in_sample
- **Layout** (Layout, bigint) — used_in_sample:30/30
- **Locked** (Locked__s, boolean) — used_in_sample:30/30
- **Modified By** (Modified_By, ownerlookup) — used_in_sample:30/30
- **Modified Time** (Modified_Time, datetime) — used_in_sample:30/30
- **Probability (%)** (Probability, integer) — used_in_sample:30/30
- **Tag** (Tag, text) — used_in_sample:30/30

---

# HIDE FROM TEST LAYOUT (still stored; can be recovered)

## Hide (72)
- **526EZ Status** (EZ_Status, picklist) — used_in_sample:30/30
- **Access to VA login?** (Access_to_VA_login, picklist) — used_in_sample:2/30
- **Account Name** (Account_Name, lookup) — used_in_sample:1/30
- **ACH Form** (ACH_Form, picklist) — used_in_sample:4/30
- **Ad** (Ad, text) — mostly_empty_in_sample
- **ADID** (ADID, text) — mostly_empty_in_sample
- **All Traffic Sources** (gaconnectorfields1__All_Traffic_Sources, text) — mostly_empty_in_sample
- **Appointment Date** (Appointment_Date, date) — mostly_empty_in_sample
- **Appointment Date 2** (Appointment_Date_2, date) — mostly_empty_in_sample
- **Appointment No Show** (Appointment_No_Show, picklist) — used_in_sample:2/30
- **Appointment Status** (Appointment_Status, picklist) — used_in_sample:21/30
- **Best Method of Contact** (Best_Method_of_Contact, picklist) — used_in_sample:7/30
- **Best time to Contact** (Best_time_to_Contact, picklist) — used_in_sample:5/30
- **Branch of Service** (Branch_of_Service, picklist) — used_in_sample:13/30
- **Branch Of Servicee** (Branch_Of_Servicee, text) — mostly_empty_in_sample
- **Browser** (gaconnectorfields1__Browser, text) — mostly_empty_in_sample
- **Call Attempts and Call Completion** (Call_Attempts_and_Call_Completion, multiselectpicklist) — used_in_sample:22/30
- **Change Log Time** (Change_Log_Time__s, datetime) — mostly_empty_in_sample
- **City** (City_State, text) — used_in_sample:13/30
- **Claim Follow Up Frequency** (Claim_Follow_Up_Frequency, picklist) — used_in_sample:30/30
- **Claim Submission Status** (Claim_Submission_Status, picklist) — mostly_empty_in_sample
- **Claim Type** (Claim_Type, multiselectpicklist) — used_in_sample:3/30
- **Closing Date** (Closing_Date, date) — used_in_sample:21/30
- **Current Disability Rating** (Current_Disability_Rating, picklist) — used_in_sample:23/30
- **Date of Birth** (Date_of_Birth, date) — used_in_sample:3/30
- **Deal Name** (Deal_Name, text) — used_in_sample:30/30
- **Dependent Parents** (Dependent_Parents, boolean) — used_in_sample:30/30
- **E-Benefits Summary** (VA_Benefits_Summary, text) — mostly_empty_in_sample
- **Emergency Contact** (Emergency_Contact, text) — used_in_sample:3/30
- **Emergency Phone** (Emergency_Phone, phone) — used_in_sample:1/30
- **Evaluation Type** (Evaluation_Type, multiselectpicklist) — used_in_sample:4/30
- **GADCONFIGID** (GADCONFIGID, text) — mostly_empty_in_sample
- **Initial Claim** (Initial_Claim, boolean) — used_in_sample:30/30
- **Intent to File (ITF) Complete?** (Intent_to_File_ITF_Complete, boolean) — used_in_sample:30/30
- **Intent to File Complete?** (Intent_to_File_Complete, picklist) — used_in_sample:1/30
- **Kids in College** (Kids_in_College, picklist) — mostly_empty_in_sample
- **Last Time Contacted** (Last_Time_Contacted, text) — used_in_sample:9/30
- **Married** (Married, boolean) — used_in_sample:30/30
- **MS Date** (MS_Date, date) — used_in_sample:2/30
- **Multiple Attachments** (Multiple_Attachments, text) — mostly_empty_in_sample
- **Multiple Attachments 1** (Multiple_Attachments_1, fileupload) — mostly_empty_in_sample
- **Multiple Attachments 2** (Multiple_Attachments_2, fileupload) — used_in_sample:2/30
- **Multiple Attachments 3** (Multiple_Attachments_3, fileupload) — used_in_sample:1/30
- **Multiple Attachments 4** (Multiple_Attachments_4, fileupload) — mostly_empty_in_sample
- **Multiple Attachments 5** (Multiple_Attachments_5, fileupload) — mostly_empty_in_sample
- **Multiple Attachments 6** (Multiple_Attachments_6, fileupload) — mostly_empty_in_sample
- **Not Affiliated With VA, DAV, VSO** (Not_Affiliated_With_VA_DAV_VSO, picklist) — used_in_sample:3/30
- **Objection Type** (Objection_Type, picklist) — used_in_sample:1/30
- **Overall Sales Duration** (Overall_Sales_Duration, integer) — used_in_sample:21/30
- **Package Type** (Package_Type, picklist) — mostly_empty_in_sample
- **Preferred Physician** (Preferred_Physician, text) — mostly_empty_in_sample
- **Priority** (Priority, picklist) — used_in_sample:4/30
- **Private Health Care?** (Private_Health_Care, text) — mostly_empty_in_sample
- **Projected Monthly Benefit Increase** (Projected_Monthly_Benefit_Increase, currency) — mostly_empty_in_sample
- **Projected Rating Increase** (Projected_Rating_Increase, picklist) — mostly_empty_in_sample
- **Qualification Score** (Qualification_Score, picklist) — mostly_empty_in_sample
- **QUESTIONNAIRE FORM** (QUESTIONNAIRE_FORM, text) — used_in_sample:13/30
- **Reason For Loss** (Reason_For_Loss__s, picklist) — mostly_empty_in_sample
- **Referrals Generated** (Referrals_Generated, integer) — mostly_empty_in_sample
- **Release Form** (Release_Form, picklist) — used_in_sample:4/30
- **Sales Cycle Duration** (Sales_Cycle_Duration, integer) — used_in_sample:21/30
- **Secondary Contact** (Secondary_Contact, phone) — used_in_sample:3/30
- **Service Agreement** (Service_Agreement, picklist) — used_in_sample:4/30
- **Service Branch** (Service_Branch, text) — used_in_sample:1/30
- **Time Zone** (TimeZone, picklist) — used_in_sample:15/30
- **Time Zone0** (gaconnectorfields1__Time_Zone, text) — mostly_empty_in_sample
- **Type** (Type, picklist) — used_in_sample:2/30
- **VA Disability Status** (VA_Disability_Status, picklist) — mostly_empty_in_sample
- **Veteran Deployment Status** (Veteran_Status, picklist) — used_in_sample:5/30
- **Veteran Live Status** (Veteran_Live_Status, textarea) — used_in_sample:30/30
- **Veterans Goals** (Veterans_Goals, textarea) — used_in_sample:23/30
- **Walk Through Scheduled?** (Walk_Through_Scheduled, picklist) — mostly_empty_in_sample

---

# New fields to ADD (not in Zoho yet)
- Next Action Owner (user lookup)
- Next Action Due Date (date)
- Blocker / Waiting On (picklist: Client, Provider, TYFYS, Records, Payment, Other)
- Claim Issues (Working Summary) (long text; auto-merge raw needs fields)
- Primary Need Categories (multi-select picklist)